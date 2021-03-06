import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckSquare } from "@fortawesome/free-solid-svg-icons";
import { faSquare } from "@fortawesome/free-regular-svg-icons";

import AV from "leancloud-storage/live-query";

import "./style.css";

export default class AssignPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      eventJudges: [],
      eventTeams: [],
      judgeTeamPairs: [],
      timesEachTeamGetsJudged: ""
    };
    this.fetchEventJudges = this.fetchEventJudges.bind(this);
    this.fetchEventTeams = this.fetchEventTeams.bind(this);
    this.fetchJudgeTeamPairs = this.fetchJudgeTeamPairs.bind(this);
    this.handleTimesEachTeamGetsJudgedChange = this.handleTimesEachTeamGetsJudgedChange.bind(
      this
    );
    this.assign = this.assign.bind(this);
    this.unassign = this.unassign.bind(this);
    this.clear = this.clear.bind(this);
    this.shuffle = this.shuffle.bind(this);
    this.autoAssign = this.autoAssign.bind(this);
  }

  componentDidMount() {
    const { history } = this.props;
    if (!AV.User.current()) {
      history.push("/");
    } else {
      this.fetchEventJudges();
    }
  }

  fetchEventJudges() {
    const { match } = this.props;
    const eventJudgesQuery = new AV.Query("EventJudge");
    eventJudgesQuery
      .equalTo("event", AV.Object.createWithoutData("Event", match.params.id))
      .include("user")
      .limit(1000)
      .find()
      .then(eventJudges => {
        this.setState(
          {
            eventJudges: eventJudges.sort((a, b) =>
              a.get("user").get("name") < b.get("user").get("name") ? -1 : 1
            )
          },
          this.fetchEventTeams
        );
      })
      .catch(error => {
        alert(error);
      });
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
        this.setState({ eventTeams }, this.fetchJudgeTeamPairs);
      })
      .catch(error => {
        alert(error);
      });
  }

  fetchJudgeTeamPairs() {
    const { match } = this.props;
    const eventTeamsQuery = new AV.Query("EventTeam");
    eventTeamsQuery
      .equalTo("event", AV.Object.createWithoutData("Event", match.params.id))
      .limit(1000);
    const judgeTeamPairsQuery = new AV.Query("JudgeTeamPair");
    judgeTeamPairsQuery
      .matchesQuery("eventTeam", eventTeamsQuery)
      .include("eventJudge")
      .include("eventJudge.user")
      .include("eventTeam")
      .limit(1000)
      .find()
      .then(judgeTeamPairs => {
        this.setState({ judgeTeamPairs });
      })
      .catch(error => {
        alert(error);
      });
  }

  handleTimesEachTeamGetsJudgedChange(e) {
    this.setState({ timesEachTeamGetsJudged: e.target.value });
  }

  assign(eventJudge, eventTeam) {
    const judgeTeamPairACL = new AV.ACL();
    judgeTeamPairACL.setReadAccess(eventJudge.get("user"), true);
    judgeTeamPairACL.setWriteAccess(eventJudge.get("user"), true);
    judgeTeamPairACL.setRoleReadAccess(new AV.Role("Admin"), true);
    judgeTeamPairACL.setRoleWriteAccess(new AV.Role("Admin"), true);
    const judgeTeamPair = new AV.Object("JudgeTeamPair");
    judgeTeamPair
      .set("eventJudge", eventJudge)
      .set("eventTeam", eventTeam)
      .setACL(judgeTeamPairACL)
      .save()
      .then(this.fetchJudgeTeamPairs)
      .catch(error => {
        alert(error);
      });
  }

  unassign(judgeTeamPair) {
    if (
      window.confirm(
        `Are you sure to unassign? All the scores entered by ${judgeTeamPair
          .get("eventJudge")
          .get("user")
          .get("name")} for ${judgeTeamPair
          .get("eventTeam")
          .get("name")} (if there are any) will be deleted.`
      )
    ) {
      judgeTeamPair
        .destroy()
        .then(this.fetchJudgeTeamPairs)
        .catch(error => {
          alert(error);
        });
    }
  }

  clear() {
    const { judgeTeamPairs } = this.state;
    if (
      !judgeTeamPairs.length ||
      window.confirm(
        "Are you sure to clear assignment? All the scores entered by judges (if there are any) will be deleted."
      )
    ) {
      AV.Object.destroyAll(judgeTeamPairs)
        .then(this.fetchJudgeTeamPairs)
        .catch(error => {
          alert(error);
        });
    }
  }

  shuffle(array) {
    const result = array.map(array => array);
    let m = result.length,
      t,
      i;
    while (m) {
      i = Math.floor(Math.random() * m--);
      t = result[m];
      result[m] = result[i];
      result[i] = t;
    }
    return result;
  }

  autoAssign(e) {
    const {
      eventJudges,
      eventTeams,
      judgeTeamPairs,
      timesEachTeamGetsJudged
    } = this.state;
    if (
      !judgeTeamPairs.length ||
      window.confirm(
        "Are you sure to perform assignment? All the scores entered by judges (if there are any) will be deleted."
      )
    ) {
      const result = eventJudges.map(eventJudge => ({
        eventJudge,
        eventTeams: []
      }));
      this.shuffle(
        Object.values(
          this.shuffle(eventTeams).reduce(
            (accumulator, eventTeam) => ({
              ...accumulator,
              [eventTeam.get("school")]: [
                ...(accumulator[eventTeam.get("school")] || []),
                eventTeam
              ]
            }),
            {}
          )
        )
      )
        .flat()
        .forEach(eventTeam => {
          this.shuffle(result)
            .sort((a, b) => a.eventTeams.length - b.eventTeams.length)
            .slice(0, timesEachTeamGetsJudged)
            .forEach(({ eventTeams }) => {
              eventTeams.push(eventTeam);
            });
        });
      AV.Object.destroyAll(judgeTeamPairs)
        .then(() => {
          AV.Object.saveAll(
            result.reduce((accumulator, { eventJudge, eventTeams }) => {
              const judgeTeamPairACL = new AV.ACL();
              judgeTeamPairACL.setReadAccess(eventJudge.get("user"), true);
              judgeTeamPairACL.setWriteAccess(eventJudge.get("user"), true);
              judgeTeamPairACL.setRoleReadAccess(new AV.Role("Admin"), true);
              judgeTeamPairACL.setRoleWriteAccess(new AV.Role("Admin"), true);
              const judgeTeamPairs = eventTeams.map(eventTeam => {
                const judgeTeamPair = new AV.Object("JudgeTeamPair");
                return judgeTeamPair
                  .set("eventJudge", eventJudge)
                  .set("eventTeam", eventTeam)
                  .setACL(judgeTeamPairACL);
              });
              return [...accumulator, ...judgeTeamPairs];
            }, [])
          )
            .then(this.fetchJudgeTeamPairs)
            .catch(error => {
              alert(error);
            });
        })
        .catch(error => {
          alert(error);
        });
    }
    e.preventDefault();
  }

  render() {
    const {
      eventJudges,
      eventTeams,
      judgeTeamPairs,
      timesEachTeamGetsJudged
    } = this.state;
    return (
      <div id="page">
        <div className="columns">
          <div className="column">
            <div className="card">
              <section className="fields">
                <h1>Current Assignment</h1>
                <div className="field">
                  <table className="condensed">
                    <thead>
                      <tr>
                        <th>
                          <span>Judge</span>
                        </th>
                        {eventTeams.map(eventTeam => (
                          <th key={eventTeam.id}>
                            <span>{eventTeam.get("name")}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {eventJudges.map(eventJudge => (
                        <tr key={eventJudge.id}>
                          <td>{eventJudge.get("user").get("name")}</td>
                          {eventTeams.map(eventTeam => (
                            <td key={eventTeam.id}>
                              {judgeTeamPairs.filter(
                                judgeTeamPair =>
                                  judgeTeamPair.get("eventJudge").id ===
                                    eventJudge.id &&
                                  judgeTeamPair.get("eventTeam").id ===
                                    eventTeam.id
                              ).length ? (
                                <button
                                  style={{ width: "36px" }}
                                  aria-label={`${eventJudge
                                    .get("user")
                                    .get(
                                      "name"
                                    )} is assigned to ${eventTeam.get(
                                    "name"
                                  )}. Click to unassign.`}
                                  onClick={() => {
                                    this.unassign(
                                      judgeTeamPairs.filter(
                                        judgeTeamPair =>
                                          judgeTeamPair.get("eventJudge").id ===
                                            eventJudge.id &&
                                          judgeTeamPair.get("eventTeam").id ===
                                            eventTeam.id
                                      )[0]
                                    );
                                  }}
                                >
                                  <FontAwesomeIcon icon={faCheckSquare} />
                                </button>
                              ) : (
                                <button
                                  style={{ width: "36px" }}
                                  aria-label={`${eventJudge
                                    .get("user")
                                    .get(
                                      "name"
                                    )} is not assigned to ${eventTeam.get(
                                    "name"
                                  )}. Click to assign.`}
                                  onClick={() => {
                                    this.assign(eventJudge, eventTeam);
                                  }}
                                >
                                  <FontAwesomeIcon icon={faSquare} />
                                </button>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="field">
                  <button onClick={this.clear}>Clear Assignment</button>
                </div>
              </section>
              <section className="fields">
                <h1>Auto Assign</h1>
                <form onSubmit={this.autoAssign}>
                  <div className="field field--half">
                    <label>
                      <span>Times Each Team Gets Judged</span>
                      <input
                        type="number"
                        value={timesEachTeamGetsJudged}
                        min="0"
                        max={eventJudges.length}
                        step="1"
                        onChange={this.handleTimesEachTeamGetsJudgedChange}
                        required
                      />
                    </label>
                  </div>
                  <div className="field">
                    <button type="submit" className="primary">
                      Perform Assignment
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
