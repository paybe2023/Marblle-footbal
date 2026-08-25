export class MatchState {
  constructor(config) {
    this.config = config;
    this.scores = Object.fromEntries(config.teams.map(team => [team.id, 0]));
    this.qualified = [];
    this.finished = false;
  }

  isActive(teamId) {
    return !this.finished && !this.qualified.includes(teamId);
  }

  score(teamId) {
    if (!this.isActive(teamId)) return { accepted: false, qualified: false, finished: this.finished };
    this.scores[teamId] += 1;
    const qualified = this.scores[teamId] >= this.config.targetScore;
    if (qualified) this.qualified.push(teamId);
    if (this.qualified.length === 2) this.finished = true;
    return { accepted: true, qualified, finished: this.finished, place: qualified ? this.qualified.length : null };
  }
}
