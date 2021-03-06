import React from "react";

import AV from "leancloud-storage/live-query";

import "./style.css";

export default class PscoringPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      scores: []
    };
    this.fetchPresentationScores = this.fetchPresentationScores.bind(this);
    this.handleScoreChange = this.handleScoreChange.bind(this);
    this.submitScore = this.submitScore.bind(this);
  }

  componentDidMount() {
    const { history } = this.props;
    if (!AV.User.current()) {
      history.push("/");
    } else {
      this.fetchPresentationScores();
    }
  }

  fetchPresentationScores() {
    const { match } = this.props;
    const eventJudgesQuery = new AV.Query("EventJudge");
    eventJudgesQuery
      .equalTo("event", AV.Object.createWithoutData("Event", match.params.id))
      .equalTo("user", AV.User.current())
      .first()
      .then(eventJudge => {
        const presentationScoresQuery = new AV.Query("PresentationScore");
        presentationScoresQuery
          .equalTo("eventJudge", eventJudge)
          .include("eventTeam")
          .limit(1000)
          .find()
          .then(presentationScores => {
            this.setState({
              scores: presentationScores
                .sort(
                  (a, b) =>
                    a.get("eventTeam").get("place") -
                    b.get("eventTeam").get("place")
                )
                .map(presentationScore => ({
                  presentationScore,
                  value:
                    presentationScore.get("score") === undefined
                      ? ""
                      : presentationScore.get("score")
                }))
            });
          })
          .catch(error => {
            alert(error);
          });
      })
      .catch(error => {
        alert(error);
      });
  }

  handleScoreChange(e, presentationScore) {
    const { scores } = this.state;
    this.setState({
      scores: scores.map(score => ({
        presentationScore: score.presentationScore,
        value:
          score.presentationScore.id === presentationScore.id
            ? e.target.value
            : score.value
      }))
    });
  }

  submitScore(e, score) {
    if (!(parseInt(score.value) >= 0 && parseInt(score.value) <= 10)) {
      alert("Invalid value.");
    } else {
      score.presentationScore
        .set("score", parseInt(score.value))
        .save()
        .then(() => {
          const { scores } = this.state;
          alert("Score submitted.");
          this.setState({ scores });
        })
        .catch(error => {
          alert(error);
        });
    }
    e.preventDefault();
  }

  render() {
    const { scores } = this.state;
    return (
      <div id="page">
        <div className="columns">
          <div className="column">
            <div className="card">
              {scores.map(score => (
                <section className="fields" key={score.presentationScore.id}>
                  <h1>
                    {score.presentationScore.get("eventTeam").get("name")}
                  </h1>
                  <form
                    onSubmit={e => {
                      this.submitScore(e, score);
                    }}
                  >
                    <div className="field">
                      <label>
                        <span>
                          Presentation Score{" "}
                          <strong style={{ color: "#0099ff" }}>(0-10)</strong>
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="1"
                          value={score.value}
                          onChange={e => {
                            this.handleScoreChange(e, score.presentationScore);
                          }}
                          required
                          disabled={
                            score.presentationScore.get("score") !== undefined
                          }
                        ></input>
                      </label>
                    </div>
                    {score.presentationScore.get("score") === undefined ? (
                      <div className="field">
                        <button type="submit" className="primary">
                          Submit
                        </button>
                      </div>
                    ) : null}
                  </form>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
