import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown } from "@fortawesome/free-solid-svg-icons";

import AV from "leancloud-storage/live-query";
import Papa from "papaparse";
import xlsxParser from "xlsx-parse-json";

import "./style.css";

export default class TeamsPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      eventTeams: [],
      teamName: "",
      school: "",
      schoolPrediction: "",
      appName: "",
      appDescription: "",
      teamsSearch: "",
      textToBeImported: "",
      fileToBeImported: {}
    };
    this.fetchEventTeams = this.fetchEventTeams.bind(this);
    this.handleTeamNameChange = this.handleTeamNameChange.bind(this);
    this.handleSchoolChange = this.handleSchoolChange.bind(this);
    this.handleSchoolCompletion = this.handleSchoolCompletion.bind(this);
    this.handleAppNameChange = this.handleAppNameChange.bind(this);
    this.handleAppDescriptionChange = this.handleAppDescriptionChange.bind(
      this
    );
    this.handleTeamsSearchChange = this.handleTeamsSearchChange.bind(this);
    this.handleTextToBeImportedChange = this.handleTextToBeImportedChange.bind(
      this
    );
    this.createPresentationScores = this.createPresentationScores.bind(this);
    this.createEventTeam = this.createEventTeam.bind(this);
    this.editEventTeam = this.editEventTeam.bind(this);
    this.deleteEventTeam = this.deleteEventTeam.bind(this);
    this.handleFileUploadChange = this.handleFileUploadChange.bind(this);
    this.importFromFile = this.importFromFile.bind(this);
    this.importCsvFile = this.importCsvFile.bind(this);
    this.importXlsxFile = this.importXlsxFile.bind(this);
    this.importFromText = this.importFromText.bind(this);
    this.importFromJson = this.importFromJson.bind(this);
  }

  componentDidMount() {
    const { history } = this.props;
    if (!AV.User.current()) {
      history.push("/");
    } else {
      this.fetchEventTeams();
    }
  }

  fetchEventTeams() {
    const { match } = this.props;
    const eventTeamsQuery = new AV.Query("EventTeam");
    eventTeamsQuery
      .equalTo("event", AV.Object.createWithoutData("Event", match.params.id))
      .addAscending("place")
      .addAscending("school")
      .addAscending("name")
      .limit(1000)
      .find()
      .then(eventTeams => {
        this.setState({ eventTeams });
      })
      .catch(error => {
        alert(error);
      });
  }

  handleTeamNameChange(e) {
    this.setState({ teamName: e.target.value });
  }

  handleSchoolChange(e) {
    this.setState({ school: e.target.value }, () => {
      const { school } = this.state;
      if (school) {
        const eventTeamsQuery = new AV.Query("EventTeam");
        eventTeamsQuery
          .startsWith("school", school)
          .first()
          .then(eventTeam => {
            this.setState({
              schoolPrediction: eventTeam ? eventTeam.get("school") : ""
            });
          });
      } else {
        this.setState({ schoolPrediction: "" });
      }
    });
  }

  handleSchoolCompletion(e) {
    const { schoolPrediction } = this.state;
    if (e.keyCode === 40) {
      this.setState({ school: schoolPrediction });
    }
  }

  handleAppNameChange(e) {
    this.setState({ appName: e.target.value });
  }

  handleAppDescriptionChange(e) {
    this.setState({ appDescription: e.target.value });
  }

  handleTeamsSearchChange(e) {
    this.setState({ teamsSearch: e.target.value });
  }

  handleTextToBeImportedChange(e) {
    this.setState({ textToBeImported: e.target.value });
  }

  createPresentationScores(eventTeams, callback) {
    const { match } = this.props;
    const eventJudgesQuery = new AV.Query("EventJudge");
    eventJudgesQuery
      .equalTo("event", AV.Object.createWithoutData("Event", match.params.id))
      .limit(1000)
      .find()
      .then(eventJudges => {
        AV.Object.saveAll(
          eventTeams.reduce((accumulator, eventTeam) => {
            const presentationScores = eventJudges.map(eventJudge => {
              const presentationScoreACL = new AV.ACL();
              presentationScoreACL.setReadAccess(eventJudge.get("user"), true);
              presentationScoreACL.setWriteAccess(eventJudge.get("user"), true);
              presentationScoreACL.setRoleReadAccess(
                new AV.Role("Admin"),
                true
              );
              presentationScoreACL.setRoleWriteAccess(
                new AV.Role("Admin"),
                true
              );
              return new AV.Object("PresentationScore")
                .set("eventJudge", eventJudge)
                .set("eventTeam", eventTeam)
                .setACL(presentationScoreACL);
            });
            return [...accumulator, ...presentationScores];
          }, [])
        )
          .then(callback)
          .catch(error => {
            alert(error);
          });
      })
      .catch(error => {
        alert(error);
      });
  }

  createEventTeam(e) {
    const { match } = this.props;
    const { teamName, school, appName, appDescription } = this.state;
    const eventTeam = new AV.Object("EventTeam");
    eventTeam
      .set("event", AV.Object.createWithoutData("Event", match.params.id))
      .set("name", teamName)
      .set("school", school)
      .set("appName", appName)
      .set("appDescription", appDescription)
      .save()
      .then(() => {
        this.createPresentationScores([eventTeam], () => {
          alert("Team successfully added.");
          this.setState(
            { teamName: "", school: "", appName: "", appDescription: "" },
            this.fetchEventTeams
          );
        });
      })
      .catch(error => {
        if (error.code === 137) {
          alert("Team already exists.");
        } else {
          alert(error);
        }
      });
    e.preventDefault();
  }

  editEventTeam(eventTeam) {
    const { history, match } = this.props;
    history.push(`/event/${match.params.id}/team/${eventTeam.id}`);
  }

  deleteEventTeam(eventTeam) {
    if (window.confirm(`Are you sure to delete ${eventTeam.get("name")}?`)) {
      eventTeam
        .destroy()
        .then(this.fetchEventTeams)
        .catch(error => {
          alert(error);
        });
    }
  }

  handleFileUploadChange(e) {
    if (e.target.files[0]) {
      this.setState({ fileToBeImported: e.target.files[0] });
    }
  }

  importFromFile(e) {
    const { fileToBeImported } = this.state;
    if (fileToBeImported.type === "text/csv") {
      this.importCsvFile();
    } else if (
      fileToBeImported.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      this.importXlsxFile();
    } else {
      alert("File must be of type .xlsx or .csv!");
    }
    e.preventDefault();
  }

  importCsvFile() {
    const { fileToBeImported } = this.state;
    Papa.parse(fileToBeImported, {
      complete: results => {
        this.importFromJson(results.data);
      },
      header: true
    });
  }

  importXlsxFile() {
    const { fileToBeImported } = this.state;
    xlsxParser.onFileSelection(fileToBeImported).then(sheets => {
      Object.values(sheets).forEach(this.importFromJson);
    });
  }

  importFromText(e) {
    let { textToBeImported } = this.state;
    textToBeImported = textToBeImported.trim();
    if (
      !textToBeImported.startsWith("name,school,appName,appDescription\n") &&
      !textToBeImported.startsWith("name\tschool\tappName\tappDescription\n")
    ) {
      textToBeImported = `name,school,appName,appDescription\n${textToBeImported}`;
    }
    Papa.parse(textToBeImported, {
      complete: results => {
        this.importFromJson(results.data);
      },
      header: true
    });
    e.preventDefault();
  }

  importFromJson(jsonToBeImported) {
    const { match } = this.props;
    const eventTeams = jsonToBeImported.map(row =>
      new AV.Object("EventTeam")
        .set("event", AV.Object.createWithoutData("Event", match.params.id))
        .set("name", row.name.trim())
        .set("school", row.school.trim())
        .set("appName", row.appName.trim())
        .set("appDescription", row.appDescription.trim())
    );
    AV.Object.saveAll(eventTeams)
      .then(() => {
        this.createPresentationScores(eventTeams, () => {
          alert("Teams successfully imported.");
          this.setState({ textToBeImported: "" }, this.fetchEventTeams);
        });
      })
      .catch(error => {
        if (error.code === 137) {
          this.createPresentationScores(eventTeams, () => {
            alert("Teams successfully imported with duplicate teams skipped.");
            this.setState({ textToBeImported: "" }, this.fetchEventTeams);
          });
        } else {
          alert(error);
        }
      });
  }

  render() {
    const {
      eventTeams,
      teamName,
      school,
      schoolPrediction,
      appName,
      appDescription,
      teamsSearch,
      textToBeImported
    } = this.state;
    return (
      <div id="page">
        <div className="columns">
          <div className="column">
            <div className="card">
              <section className="fields">
                <h1>New Team</h1>
                <form onSubmit={this.createEventTeam}>
                  <div className="field field--half">
                    <label>
                      <span>Team Name</span>
                      <input
                        type="text"
                        value={teamName}
                        onChange={this.handleTeamNameChange}
                        required
                      />
                    </label>
                  </div>
                  <div className="field field--half field--with--dropdown">
                    <label>
                      <span>School</span>
                      <input
                        type="text"
                        value={school}
                        onChange={this.handleSchoolChange}
                        onKeyDown={this.handleSchoolCompletion}
                        required
                      />
                      <div
                        className="dropdown"
                        style={{
                          display:
                            schoolPrediction && school !== schoolPrediction
                              ? null
                              : "none"
                        }}
                      >
                        <span style={{ float: "left" }}>
                          {schoolPrediction}
                        </span>
                        <span style={{ float: "right" }}>
                          <kbd style={{ fontSize: "6pt" }}>
                            <FontAwesomeIcon icon={faArrowDown} />
                          </kbd>
                        </span>
                      </div>
                    </label>
                  </div>
                  <div className="field field--half">
                    <label>
                      <span>App Name</span>
                      <input
                        type="text"
                        value={appName}
                        onChange={this.handleAppNameChange}
                        required
                      />
                    </label>
                  </div>
                  <div className="field field--half">
                    <label>
                      <span>App Description</span>
                      <input
                        type="text"
                        value={appDescription}
                        onChange={this.handleAppDescriptionChange}
                        required
                      />
                    </label>
                  </div>
                  <div className="field">
                    <button type="submit" className="primary">
                      Create
                    </button>
                  </div>
                </form>
              </section>
            </div>
            <div className="card">
              <section className="fields">
                <h1>Existing Teams ({eventTeams.length})</h1>
                <div className="field field--half">
                  <label>
                    <span>Search</span>
                    <input
                      type="text"
                      value={teamsSearch}
                      onChange={this.handleTeamsSearchChange}
                    />
                  </label>
                </div>
                <div className="field">
                  <table>
                    <thead>
                      <tr>
                        <th>Team Name</th>
                        <th>School</th>
                        <th>App Name</th>
                        <th>App Description</th>
                        <th>Place</th>
                        <th>Edit</th>
                        <th>Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventTeams
                        .filter(eventTeam =>
                          teamsSearch
                            ? eventTeam
                                .get("name")
                                .toLowerCase()
                                .includes(teamsSearch.toLowerCase()) ||
                              eventTeam
                                .get("appName")
                                .toLowerCase()
                                .includes(teamsSearch.toLowerCase())
                            : true
                        )
                        .map(eventTeam => (
                          <tr key={eventTeam.id}>
                            <td>{eventTeam.get("name")}</td>
                            <td>{eventTeam.get("school")}</td>
                            <td>{eventTeam.get("appName")}</td>
                            <td>{eventTeam.get("appDescription")}</td>
                            <td>{eventTeam.get("place")}</td>
                            <td>
                              <button
                                onClick={() => {
                                  this.editEventTeam(eventTeam);
                                }}
                              >
                                Edit
                              </button>
                            </td>
                            <td>
                              <button
                                onClick={() => {
                                  this.deleteEventTeam(eventTeam);
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
            <div className="card">
              <section className="fields">
                <h1>Import Teams</h1>
                <form onSubmit={this.importFromText}>
                  <div className="field">
                    <label>
                      <span>Paste CSV or TSV Here</span>
                      <textarea
                        rows="20"
                        placeholder={
                          "name,school,appName,appDescription\nThe Dream Team,UCI,The Dream App,This is the coolest app in the world!\nThe Daydream Team,UCLA,The Daydream App,This is the hottest app in the world!\n…"
                        }
                        value={textToBeImported}
                        onChange={this.handleTextToBeImportedChange}
                        required
                      ></textarea>
                    </label>
                  </div>
                  <div className="field">
                    <button type="submit" className="primary">
                      Import
                    </button>
                  </div>
                </form>
                <form onSubmit={this.importFromFile}>
                  <div className="field">
                    <label>
                      <span>Upload XLSX or CSV file Here</span>
                      <input
                        type="file"
                        accept=".xlsx,.csv"
                        onChange={this.handleFileUploadChange}
                        required
                      />
                    </label>
                  </div>
                  <div className="field">
                    <button type="submit" className="primary">
                      Upload
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
