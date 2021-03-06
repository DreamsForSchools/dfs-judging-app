import React from "react";

import AV from "leancloud-storage/live-query";

import "./style.css";

export default class PresentationPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      eventTeams: [],
      presentationScores: [],
      currentEventTeam: ""
    };
    this.fetchEventTeams = this.fetchEventTeams.bind(this);
    this.fetchPresentationScores = this.fetchPresentationScores.bind(this);
    this.handleCurrentEventTeamChange = this.handleCurrentEventTeamChange.bind(
      this
    );
    this.inputPresentationScore = this.inputPresentationScore.bind(this);
    this.correctData = this.correctData.bind(this);
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
        this.setState({ eventTeams }, this.fetchPresentationScores);
      })
      .catch(error => {
        alert(error);
      });
  }

  fetchPresentationScores() {
    const { match } = this.props;
    const eventTeamsQuery = new AV.Query("EventTeam");
    eventTeamsQuery
      .equalTo("event", AV.Object.createWithoutData("Event", match.params.id))
      .limit(1000);
    const presentationScoresQuery = new AV.Query("PresentationScore");
    presentationScoresQuery
      .matchesQuery("eventTeam", eventTeamsQuery)
      .include("eventJudge")
      .include("eventJudge.user")
      .include("eventTeam")
      .limit(1000)
      .find()
      .then(presentationScores => {
        this.setState({
          presentationScores: presentationScores.sort((a, b) =>
            a
              .get("eventJudge")
              .get("user")
              .get("name") <
            b
              .get("eventJudge")
              .get("user")
              .get("name")
              ? -1
              : 1
          )
        });
      })
      .catch(error => {
        alert(error);
      });
  }

  handleCurrentEventTeamChange(e) {
    this.setState({ currentEventTeam: e.target.value });
  }

  inputPresentationScore(presentationScore) {
    const newScore = window.prompt(
      `Enter the presentation score ${presentationScore
        .get("eventJudge")
        .get("user")
        .get("name")} is giving to ${presentationScore
        .get("eventTeam")
        .get("name")}:`
    );
    if (newScore !== null) {
      if (!(parseInt(newScore) >= 0 && parseInt(newScore) <= 10)) {
        alert("Invalid value.");
      } else {
        presentationScore
          .set("score", parseInt(newScore))
          .save()
          .then(() => {
            alert("Presentation score saved.");
            this.fetchPresentationScores();
          })
          .catch(error => {
            alert(error);
          });
      }
    }
  }

  correctData() {
    const { match } = this.props;
    const eventJudgesQuery = new AV.Query("EventJudge");
    eventJudgesQuery
      .equalTo("event", AV.Object.createWithoutData("Event", match.params.id))
      .limit(1000)
      .find()
      .then(eventJudges => {
        const eventTeamsQuery = new AV.Query("EventTeam");
        eventTeamsQuery
          .equalTo(
            "event",
            AV.Object.createWithoutData("Event", match.params.id)
          )
          .limit(1000)
          .find()
          .then(eventTeams => {
            const presentationScores = [];
            eventJudges.forEach(eventJudge => {
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
              eventTeams.forEach(eventTeam => {
                const presentationScore = new AV.Object("PresentationScore");
                presentationScore
                  .set("eventTeam", eventTeam)
                  .set("eventJudge", eventJudge)
                  .setACL(presentationScoreACL);
                presentationScores.push(presentationScore);
              });
            });
            AV.Object.saveAll(presentationScores)
              .then(() => {
                alert("Data correction completed.");
                this.fetchPresentationScores();
              })
              .catch(error => {
                if (error.code === 137) {
                  alert("Data correction completed.");
                  this.fetchPresentationScores();
                } else {
                  alert(error);
                }
              });
          });
      });
  }

  render() {
    const { eventTeams, presentationScores, currentEventTeam } = this.state;
    return (
      <div id="page">
        <div className="columns">
          <div className="column">
            <div className="card">
              <section className="fields">
                <h1>Presentation Scores</h1>
                <div className="field field--half">
                  <select
                    value={currentEventTeam}
                    onChange={this.handleCurrentEventTeamChange}
                  >
                    <option value="">All Teams</option>
                    {eventTeams.map(eventTeam => (
                      <option key={eventTeam.id} value={eventTeam.id}>
                        {eventTeam.get("name")}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  {currentEventTeam ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Judge</th>
                          <th>Score</th>
                          <th>Input</th>
                        </tr>
                      </thead>
                      <tbody>
                        {presentationScores
                          .filter(
                            presentationScore =>
                              presentationScore.get("eventTeam").id ===
                              currentEventTeam
                          )
                          .map(presentationScore => (
                            <tr key={presentationScore.id}>
                              <td>
                                {presentationScore
                                  .get("eventJudge")
                                  .get("user")
                                  .get("name")}
                              </td>
                              <td>{presentationScore.get("score")}</td>
                              <td>
                                {presentationScore.get("score") ===
                                undefined ? (
                                  <button
                                    onClick={() => {
                                      this.inputPresentationScore(
                                        presentationScore
                                      );
                                    }}
                                  >
                                    Input
                                  </button>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>Place</th>
                          <th>Team Name</th>
                          <th>Total Score</th>
                          <th>Average Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eventTeams
                          .map(eventTeam => {
                            const presentationScoresWithScores = presentationScores.filter(
                              presentationScore =>
                                presentationScore.get("eventTeam").id ===
                                  eventTeam.id &&
                                presentationScore.get("score") !== undefined
                            );
                            const totalScore = presentationScoresWithScores.reduce(
                              (accumulator, presentationScore) =>
                                accumulator + presentationScore.get("score"),
                              0
                            );
                            const averageScore = presentationScoresWithScores.length
                              ? totalScore / presentationScoresWithScores.length
                              : 0;
                            return {
                              eventTeam,
                              totalScore,
                              averageScore
                            };
                          })
                          .sort((a, b) => b.averageScore - a.averageScore)
                          .map((place, index) => (
                            <tr key={place.eventTeam.id}>
                              <td>{index + 1}</td>
                              <td>{place.eventTeam.get("name")}</td>
                              <td>{place.totalScore}</td>
                              <td>{place.averageScore.toFixed(2)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            </div>
            <div className="card">
              <section className="fields">
                <h1>Data Correction</h1>
                <p>
                  If one or more judges report that they cannot find one or more
                  teams when giving presentation scores, or if one or more
                  judges are missing when a team is selected above, clicking on
                  the button below may fix the issue. If the issue persists
                  after clicking on the button, please try manually removing the
                  judges that have problems and adding them again. Clicking on
                  the button below <strong>will not</strong> remove any existing
                  scores or presentation scores stored in the system. However,
                  manually removing a judge <strong>will</strong> remove all the
                  scores and presentation scores given by this judge.
                </p>
                <div className="field field--half">
                  <button onClick={this.correctData}>Perform Correction</button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
