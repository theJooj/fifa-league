require('normalize.css');
require('styles/App.css');

import React from 'react';
import update from 'react-addons-update';
const Scheduler = require('./Schedule');
let { TextField, Dialog, Avatar } = require('material-ui');
const moment = require('moment');

class AppComponent extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      teams: [],
      schedule: [],
      week: 0,
      index: 0,
      game: {},
      startDateInput: '11/12/2015',
      startDate: ''
    }
  }

  componentWillMount(){
    var self = this;
    this.teamsRef = new Firebase('https://cvent-fifa-league.firebaseio.com/teams');
    this.scehduleRef = new Firebase('https://cvent-fifa-league.firebaseio.com/scehdule');

    var teams, schedule;

    this.teamsRef.on('value', function(dataSnapshot){
      teams = dataSnapshot.val();
      self.setState({teams: teams});
    });

    this.scehduleRef.on('value', function(dataSnapshot){
      schedule = dataSnapshot.val();
      self.setState({schedule: schedule});
    });
  }

  _handleTeam1Input(e){
    let newValue = parseInt(e.target.value);
    let game = this.state.game;
    let newGame = update(game, {$merge: {team1goals: newValue}});
    this.setState({game: newGame});
  }
  _handleTeam2Input(e){
    let newValue = parseInt(e.target.value);
    let game = this.state.game;
    let newGame = update(game, {$merge: {team2goals: newValue}});
    this.setState({game: newGame});
  }
  _handleStartDateChange(e){
    this.setState({
      startDateInput: e.target.value,
      startDate: moment(e.target.value)
    });
  }

  _createSchedule(){
    var self = this;
    var schedule = Scheduler.getSchedule(this.state.teams);

    var newSeason = [];

    var count = 0;

    let indexFinder = function(targetArray, key, valueToSearch){
      for(var i = 0; i < targetArray.length; i++){
        if(targetArray[i][key] === valueToSearch){
          return i;
        }
      }
      return null;
    }

    schedule.map(function(week, index){
      let day = moment(self.state.startDate).add(count, 'd');
      switch(day.day()){
        case 0:
          day.add(1, 'd');
          count ++;
          break;
        case 5:
          day.add(3, 'd');
          count += 3;
          break;
        case 6:
          day.add(2, 'd');
          count += 2;
          break;
      }

      let newWeek = {
        'games': [],
        'week': index + 1,
        'day': day.format('dddd, M/D')
      }
      for(var i in week){
        let team1index = indexFinder(self.state.teams, 'name', week[i][0].name);
        let team2index = indexFinder(self.state.teams, 'name', week[i][1].name);

        let newGame = {};
        newGame.team1 = week[i][0].name;
        newGame.team1goals = '';
        newGame.team1avatar = self.state.teams[team1index].avatar;
        newGame.team2 = week[i][1].name;
        newGame.team2goals = '';
        newGame.team2avatar = self.state.teams[team2index].avatar;

        newWeek.games.push(newGame);
      }

      newSeason.push(newWeek);
      count ++;
    });

    return newSeason;
  }

  _resetTeams(){
    let newTeams = [];
    this.state.teams.map(function(team){
      if(team !== undefined){
        let updatedTeam = update(team, {$merge: {goalsAgainst: 0, goalsFor: 0, wins: 0, losses: 0, ties: 0}});
        newTeams.push(updatedTeam);
      }
    });
    return newTeams;
  }

  _createSeason(){
    let teams = this._resetTeams();
    let schedule = this._createSchedule();

    this.teamsRef.set(teams);
    this.scehduleRef.set(schedule);
  }

  _setStartDate(){
    this.setState({seasonStartOpen: true});
  }

  render() {
    let self = this;
    let indexFinder = function(targetArray, key, valueToSearch){
      for(var i = 0; i < targetArray.length; i++){
        if(targetArray[i][key] === valueToSearch){
          return i;
        }
      }
      return null;
    }
    let _matchDialogCancel = function(){
      this.refs.matchResults.dismiss();
    }
    let _matchDialogSave = function(){
      fetch('https://hooks.slack.com/services/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', {
        method: 'post',
        body: JSON.stringify({
          text: this.state.game.team1 + ': ' + this.state.game.team1goals + '\n' + this.state.game.team2 + ': ' + this.state.game.team2goals
        })
      });
      //updates schedule with results
      var newSchedule = this.state.schedule;
      var week = this.state.week - 1;
      var updatedWeek = update(newSchedule[week], {games: {$splice: [[this.state.index, 1, this.state.game]]}});
      newSchedule = update(newSchedule, {$splice: [[week, 1, updatedWeek]]});

      //update standings with new results
      let team1goals = this.state.game.team1goals;
      let team2goals = this.state.game.team2goals;
      let newTeams = [];

      if(team1goals > team2goals){
        //give team 1 a win
        let teamIndex1 = indexFinder(this.state.teams, 'name', this.state.game.team1);
        let updatedTeam1 = this.state.teams[teamIndex1];
        updatedTeam1 = update(updatedTeam1, {wins: {$set: updatedTeam1.wins + 1}});
        updatedTeam1 = update(updatedTeam1, {goalsFor: {$set: updatedTeam1.goalsFor + team1goals}});
        updatedTeam1 = update(updatedTeam1, {goalsAgainst: {$set: updatedTeam1.goalsAgainst + team2goals}});
        newTeams = update(this.state.teams, {$splice: [[teamIndex1, 1, updatedTeam1]]});

        //give team 2 a loss
        let teamIndex2 = indexFinder(this.state.teams, 'name', this.state.game.team2);
        let updatedTeam2 = this.state.teams[teamIndex2];
        updatedTeam2 = update(updatedTeam2, {losses: {$set: updatedTeam2.losses + 1}});
        updatedTeam2 = update(updatedTeam2, {goalsFor: {$set: updatedTeam2.goalsFor + team2goals}});
        updatedTeam2 = update(updatedTeam2, {goalsAgainst: {$set: updatedTeam2.goalsAgainst + team1goals}});
        newTeams = update(newTeams, {$splice: [[teamIndex2, 1, updatedTeam2]]});

      } else if (team1goals < team2goals){
        //give team 1 a loss
        let teamIndex1 = indexFinder(this.state.teams, 'name', this.state.game.team1);
        let updatedTeam1 = this.state.teams[teamIndex1];
        updatedTeam1 = update(updatedTeam1, {losses: {$set: updatedTeam1.losses + 1}});
        updatedTeam1 = update(updatedTeam1, {goalsFor: {$set: updatedTeam1.goalsFor + team1goals}});
        updatedTeam1 = update(updatedTeam1, {goalsAgainst: {$set: updatedTeam1.goalsAgainst + team2goals}});
        newTeams = update(this.state.teams, {$splice: [[teamIndex1, 1, updatedTeam1]]});

        //give team 2 a win
        let teamIndex2 = indexFinder(this.state.teams, 'name', this.state.game.team2);
        let updatedTeam2 = this.state.teams[teamIndex2];
        updatedTeam2 = update(updatedTeam2, {wins: {$set: updatedTeam2.wins + 1}});
        updatedTeam2 = update(updatedTeam2, {goalsFor: {$set: updatedTeam2.goalsFor + team2goals}});
        updatedTeam2 = update(updatedTeam2, {goalsAgainst: {$set: updatedTeam2.goalsAgainst + team1goals}});
        newTeams = update(newTeams, {$splice: [[teamIndex2, 1, updatedTeam2]]});
      } else {
        //give team 1 a tie
        let teamIndex1 = indexFinder(this.state.teams, 'name', this.state.game.team1);
        let updatedTeam1 = this.state.teams[teamIndex1];
        updatedTeam1 = update(updatedTeam1, {ties: {$set: updatedTeam1.ties + 1}});
        updatedTeam1 = update(updatedTeam1, {goalsFor: {$set: updatedTeam1.goalsFor + team1goals}});
        updatedTeam1 = update(updatedTeam1, {goalsAgainst: {$set: updatedTeam1.goalsAgainst + team2goals}});
        newTeams = update(this.state.teams, {$splice: [[teamIndex1, 1, updatedTeam1]]});

        //give team 2 a tie
        let teamIndex2 = indexFinder(this.state.teams, 'name', this.state.game.team2);
        let updatedTeam2 = this.state.teams[teamIndex2];
        updatedTeam2 = update(updatedTeam2, {ties: {$set: updatedTeam2.ties + 1}});
        updatedTeam2 = update(updatedTeam2, {goalsFor: {$set: updatedTeam2.goalsFor + team2goals}});
        updatedTeam2 = update(updatedTeam2, {goalsAgainst: {$set: updatedTeam2.goalsAgainst + team1goals}});
        newTeams = update(newTeams, {$splice: [[teamIndex2, 1, updatedTeam2]]});
      }

      //set state with updated results
      // this.setState({schedule: newSchedule, teams: newTeams});
      this.teamsRef.set(newTeams);
      this.scehduleRef.set(newSchedule);

      //close modal
      this.refs.matchResults.dismiss();
    }
    let _seasonDialogCancel = function(){
      this.setState({seasonStartOpen: false})
    }
    let _seasonDialogSave = function(){
      this.setState({seasonStartOpen: false})
      self._createSeason();
    }
    let matchDialogActions = [
      { text: 'Cancel', onClick: _matchDialogCancel.bind(this) },
      { text: 'Submit', onClick: _matchDialogSave.bind(this) }
    ];
    let seasonDialogActions = [
      { text: 'Cancel', onClick: _seasonDialogCancel.bind(this) },
      { text: 'Submit', onClick: _seasonDialogSave.bind(this) }
    ];
    let teamsSorted = this.state.teams.sort(function(a, b){

      let aTotal = a.wins * 3 + a.ties;
      let bTotal = b.wins * 3 + b.ties;

      if(aTotal > bTotal){
        return -1;
      }
      if(aTotal < bTotal){
        return 1;
      }
      if(aTotal === bTotal){

        let aGoalDiff = a.goalsFor - a.goalsAgainst;
        let bGoalDiff = b.goalsFor - b.goalsAgainst;

        if(aGoalDiff > bGoalDiff){
          return -1;
        }
        if(aGoalDiff < bGoalDiff){
          return 1;
        }
        if(aGoalDiff === bGoalDiff){
          if(a.goalsFor > b.goalsFor){
            return -1;
          }
          if(a.goalsFor < b.goalsFor){
            return 1;
          }
          return 0;
        }
      }
    });

    let standingsList = teamsSorted.map(function(team, index){
      if(team.name !== 'Bye'){
        var rowClass = index + 4 >= teamsSorted.length ? 'cutoff' : '';

        return (
          <tr key={index} className={rowClass}>
            <td className='mdl-data-table__cell--non-numeric'><Avatar src={team.avatar} className='avatar' /></td>
            <td className='mdl-data-table__cell--non-numeric'>{team.name} <span className="hide-on-mobile">({team.gamertag})</span></td>
            <td>{team.wins + team.losses + team.ties}</td>
            <td className='hide-on-mobile'>{team.wins}</td>
            <td className='hide-on-mobile'>{team.losses}</td>
            <td className='hide-on-mobile'>{team.ties}</td>
            <td className='hide-on-mobile'>{team.goalsFor}</td>
            <td>{team.goalsFor - team.goalsAgainst}</td>
            <td>{team.wins * 3 + team.ties}</td>
          </tr>
        );
      }
    });

    let scheduleList = this.state.schedule.map(function(week, index){
      let _editMatchResults = function(week, index, game){
        return (
          function(e){
            e.preventDefault();
            self.setState({week: week, index: index, game: game});
            self.refs.matchResults.show();
          }
        );
      }
      let games = week.games.map(function(game, index){
        if(game.team1goals === '' && game.team1 !== 'Bye' && game.team2 !== 'Bye'){
          return (
            <div className="demo-card-event mdl-card mdl-shadow--2dp" key={index}>
              <div className="mdl-card__title mdl-card--expand">
                <h4>
                  <Avatar src={game.team1avatar} />{game.team1}<br />
                  <div className="versus">vs.</div>
                  <Avatar src={game.team2avatar} />{game.team2}
                </h4>
              </div>
              <div className="mdl-card__actions mdl-card--border">
                <a className="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect" href="#" onClick={_editMatchResults(week.week, index, game)}>
                  Add Match Results
                </a>
                <div className="mdl-layout-spacer"></div>
                <i className="material-icons">add</i>
              </div>
            </div>
          );
        } else if(game.team1 === 'Bye' || game.team2 === 'Bye'){
          return (
            <div className="demo-card-event mdl-card mdl-shadow--2dp played" key={index}>
              <div className="mdl-card__title mdl-card--expand">
                <h4>
                  <Avatar src={game.team1avatar} className="grayscale" />{game.team1}<br />
                  <div className="versus">vs.</div>
                  <Avatar src={game.team2avatar} className="grayscale" />{game.team2}
                </h4>
              </div>
            </div>
          );
        } else {
          return (
            <div className="demo-card-event mdl-card mdl-shadow--2dp played" key={index}>
              <div className="mdl-card__title mdl-card--expand">
                <h4>
                  <Avatar src={game.team1avatar} className="grayscale" />{game.team1}: {game.team1goals}<br />
                  <div className="versus">vs.</div>
                  <Avatar src={game.team2avatar} className="grayscale" />{game.team2}: {game.team2goals}
                </h4>
              </div>
            </div>
          );
        }
      });
      return (
        <div key={index}>
          <h3>{week.day}</h3>
          {games}
        </div>
      );
    });

    var hideButton = {
      display: 'none'
    };

    return (
      <div className="index">
        <button onClick={this._setStartDate.bind(this)} style={hideButton}>Start New Season</button>
        <div className="logo" />
        <h2 style={{color: '#fff'}}>Standings</h2>
        <table className="mdl-data-table mdl-js-data-table mdl-shadow--4dp">
          <thead>
            <tr>
              <th className="mdl-data-table__cell--non-numeric"></th>
              <th className="mdl-data-table__cell--non-numeric">Name</th>
              <th>GP</th>
              <th className="hide-on-mobile">W</th>
              <th className="hide-on-mobile">L</th>
              <th className="hide-on-mobile">T</th>
              <th className="hide-on-mobile">G</th>
              <th>GD</th>
              <th>P</th>
            </tr>
          </thead>
          <tbody>
            {standingsList}
          </tbody>
        </table>

        <h2>Schedule</h2>
        {scheduleList}
        <Dialog
          actions={matchDialogActions}
          ref="matchResults">
          <h3 className="dialog-header">Enter Match Results</h3>
          <TextField type="number" floatingLabelText={this.state.game.team1 + ' score'} value={this.state.game.team1goals} onChange={this._handleTeam1Input.bind(this)} /><br />
          <TextField type="number" floatingLabelText={this.state.game.team2 + ' score'} value={this.state.game.team2goals} onChange={this._handleTeam2Input.bind(this)} />
        </Dialog>
        <Dialog
          actions={seasonDialogActions}
          open = {this.state.seasonStartOpen}
          ref="seasonStart">
          <h3>Enter Your Season Start Date</h3>
          <TextField floatingLabelText="MM/DD/YYYY" value={this.state.startDateInput} onChange={this._handleStartDateChange.bind(this)} />
        </Dialog>
      </div>
    );
  }
}

AppComponent.defaultProps = {
};

export default AppComponent;
