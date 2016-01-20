var getSchedule = function(teams){
  var teamList = [].concat(teams);

  if (teamList.length % 2 !== 0) {
    teamList.push({
      name : 'BYE',
      team : 'BYE'
    });
  }

  var weeks = [],
    totalWeeks = (teamList.length - 1) * 2;

  while (weeks.length < totalWeeks) {
    generateWeeks();
  }

  function generateWeeks() {
    // let's shuffle the teamList so we get a unique schedule
    shuffleArray(teamList);

    var week = 1,
      numberOfTeams = teamList.length,
      a = numberOfTeams + 1;

    for (week; week < numberOfTeams; week += 1) {
      var weeklyMatchups = [],
        h = 1;

      for (h; h < numberOfTeams; h += 1) {
        var home = h,
        away = a % (numberOfTeams - 1);

        if (away === home) {
          away = numberOfTeams;
        } else {
          if (away === 0) {
            away = numberOfTeams - 1;

            if (away === home) {
              away = numberOfTeams;
            }
          }
        }

        if (!matchupExists(weeklyMatchups, teamList[away - 1])) {
          weeklyMatchups.push([teamList[home - 1], teamList[away - 1]]);
        }

        if (h < numberOfTeams - 1) {
          a -= 1;
        }

        if (a === 0) {
          a = numberOfTeams - 1;
        }
      }

      // loop through the weeklyMatchups and shuffle them
      for (var matchup in weeklyMatchups) {
        shuffleArray(weeklyMatchups[matchup]);
      }

      weeks.push(weeklyMatchups);

      if (weeks.length === totalWeeks) {
        break;
      }
    }

    function matchupExists(weeklyMatchups, away) {
      for (var i = 0, length = weeklyMatchups.length; i < length; i += 1) {
        if (weeklyMatchups[i][0].name === away.name) {
          return true;
        }
      }

      return false;
    }

    function shuffleArray(o) {
      for(var j, x, i = o.length; i; j = parseInt(Math.random() * i, 10), x = o[--i], o[i] = o[j], o[j] = x);
      return o;
    }
  }

  return weeks;
}

var exports =  {
  getSchedule: getSchedule
};

module.exports = exports;