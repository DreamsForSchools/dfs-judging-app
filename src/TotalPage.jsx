import React from "react";

import AV from "leancloud-storage/live-query";

import "./style.css";

export default class TotalPage extends React.Component {
  constructor(props) {
    super(props);
    const { match } = this.props;
    this.state = {
      event: AV.Object.createWithoutData("Event", match.params.id),
      eventTeams: [],
      judgeTeamPairs: []
    };
    this.fetchEvent = this.fetchEvent.bind(this);
    this.fetchEventTeams = this.fetchEventTeams.bind(this);
    this.fetchJudgeTeamPairs = this.fetchJudgeTeamPairs.bind(this);
  }

  componentDidMount() {
    const { history } = this.props;
    if (!AV.User.current()) {
      history.push("/");
    } else {
      this.fetchEvent();
    }
  }

  fetchEvent() {
    const { event } = this.state;
    event
      .fetch()
      .then(event => {
        this.setState({ event }, this.fetchEventTeams);
      })
      .catch(error => {
        alert(error);
      });
  }

  fetchEventTeams() {
    const { event } = this.state;
    const eventTeamsQuery = new AV.Query("EventTeam");
    eventTeamsQuery
      .equalTo("event", event)
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
    const { event } = this.state;
    const eventTeamsQuery = new AV.Query("EventTeam");
    eventTeamsQuery.equalTo("event", event).limit(1000);
    const judgeTeamPairsQuery = new AV.Query("JudgeTeamPair");
    judgeTeamPairsQuery
      .matchesQuery("eventTeam", eventTeamsQuery)
      .include("eventJudge")
      .include("eventJudge.user")
      .limit(1000)
      .find()
      .then(judgeTeamPairs => {
        this.setState({
          judgeTeamPairs: judgeTeamPairs.sort((a, b) =>
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

  render() {
    const { event, eventTeams, judgeTeamPairs } = this.state;
    return (
      <div id="page">
        <div className="columns">
          <div className="column">
            {eventTeams.map(eventTeam => (
              <div className="card" key={eventTeam.id}>
                <section className="fields">
                  <h1>{eventTeam.get("name")}</h1>
                  <div className="field">
                    <table>
                      <thead>
                        <tr>
                          <th>Judge</th>
                          {["Design", "Functionality", "Theme"].map(
                            category => (
                              <th key={category}>{category}</th>
                            )
                          )}
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {judgeTeamPairs
                          .filter(
                            judgeTeamPair =>
                              judgeTeamPair.get("eventTeam").id === eventTeam.id
                          )
                          .map(judgeTeamPair => (
                            <tr key={judgeTeamPair.id}>
                              <td>
                                {judgeTeamPair
                                  .get("eventJudge")
                                  .get("user")
                                  .get("name")}
                              </td>
                              {["Design", "Functionality", "Theme"].map(
                                category => (
                                  <td key={category}>
                                    {event
                                      .get("criteria")
                                      .filter(
                                        criterion =>
                                          criterion.category === category
                                      )
                                      .reduce(
                                        (accumulator, criterion) =>
                                          accumulator +
                                          judgeTeamPair
                                            .get("scores")
                                            .reduce(
                                              (accumulator, score) =>
                                                score.name === criterion.name
                                                  ? accumulator + score.value
                                                  : accumulator,
                                              0
                                            ),
                                        0
                                      )}
                                  </td>
                                )
                              )}
                              <td>
                                {event
                                  .get("criteria")
                                  .reduce(
                                    (accumulator, criterion) =>
                                      accumulator +
                                      judgeTeamPair
                                        .get("scores")
                                        .reduce(
                                          (accumulator, score) =>
                                            score.name === criterion.name
                                              ? accumulator + score.value
                                              : accumulator,
                                          0
                                        ),
                                    0
                                  )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}
