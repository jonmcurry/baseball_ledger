Name: Baseball Ledger
Cloud provider: GCP
Framework: React/Typescript
Player data: Using Lahman MLB csv files located at: C:\Users\jonmc\dev\baseball_ledger\data_files
People.csv
Why you need it: The stats files only use a playerID code (e.g., "ruthba01") instead of names. This file links those IDs to the players' actual first and last names.

Batting.csv
Why you need it: This contains the season-by-season offensive statistics (hits, home runs, RBIs, etc.) for all players, including position players and pitchers who batted.

Pitching.csv
Why you need it: This contains the season-by-season pitching statistics (wins, ERA, strikeouts, etc.) for all pitchers.

Fielding.csv
Why you might need it: If you strictly want to filter by "position" (e.g., only Shortstops or Catchers), this file lists the position(s) a player played each season.

Rosters:
Offensive rosters will contain 1 firstbaseman, 1 second baseman, 1 shortstop, 1 thirdbaseman, 3 outfielders, 1 catcher, 1 designated hitter
Bench will contain 4 position players
Starting pitchers will consist of 4
Relief pitchers will consist of 3
Closing pitchers will consist of 1


Workflow:
Splash page that explains the project, the purpose/what it does, gets the end-user engaged
An end-user will have options:
1) Create a new league
2) Join an existing league
3) Delete a league (if they're the commissioner)

1 - Creating a new league
This is where whomever is creating the league will be the default commissioner
They will name the league, set the number of teams (even number of teams, max of 32 teams)
Set the playoff rules
Determine if injuries are turned enabled
Determine which years they want to include in their league (by default, all years from 1901-2025)
After the league is created, randomized set of team names will be generated (fake team names, use real cities in the USA) and a random unique key is generated that can be given to other players to join the league and select their team.  Only one player can control a team, the commissioner can control all teams not controlled by a player, a commissioner can also control their own team
Teams are evenly divided into AL/NL divisions (East,South,West,North)

1.1 After the teams are created and mapped to a player or players - the rest of the teams will be controlled by the CPU - then the draft will be randomized.

AI drafting strategy:
Prioritize High-Value Positions
Starting pitching is almost always the most valuable asset. A deep rotation covers more games and has a compounding effect. After that, prioritize up-the-middle defense (C, SS, CF) since these positions are harder to fill and defensive value is often underrated by other managers in the league.
Draft Strategy by Round
Early rounds (1-3): Take the best available starting pitcher or elite position player. Favor high-ceiling players with good ratings across the board. Don't reach for closers or bench pieces.
Mid rounds (4-8): Fill out the rotation (you want 5 solid starters), grab your best available position players at premium positions, and look for undervalued high-OBP hitters if the sim rewards that.
Late rounds (9+): Target relievers, platoon pieces, and defensive specialists. Closers can often be found here since saves are a function of opportunity, not necessarily elite talent.

Teams must adhere to the roster composition in the "Rosters" breakdown

1.2 When the draft completes, the AI will generate the best lineup (there is no lineup versus lefty/righty, it'll just be one lineup), starting pitching rotation.  Player controlled teams will also get their lineups auto created but they can change them as needed

1.3 Next, there will be an auto-scheduler where the AL teams will only play AL teams and NL teams only play NL teams
All teams will play on the same day and once per day - there will be no rainouts
Starting pitchers will rotate after every game played (SP1 pitches game 1, SP2 pitches game 2, SP3 pitches game 3, SP4 pitches game 4, SP1 pitches game 5, etc.).
Relief pitchers will come in if a starting pitcher is not performing well (determine AI rule set)
Closing pitchers will come in to save the game (determine based off of MLB save opportunity rule - prioritize starting pitcher shutouts and no-hitters, though).

1.4 There will be a Stat Master that will show the league schedule, standings, simulate a day/week/month/season.  Playoffs can only be simulated one game at a time.  Playoff schedule will be follow the 2025 MLB rules.  Extra innings are possible, no ghost runners if extra innings do happen.

1.4.1 Stat Master will also track AL/NL/total league leaders as well as team stats.  These stats will mimic what the MLB captures today

1.4.2 Player controlled teams need the ability to adjust their lineups, drop players, add players, trade players

1.4.3 Archive season and player stats when a season is completed and the playoffs conclude.  This includes the wins/losses, how far a team went into the playoffs, did they win the championship, etc.  After a season and playoffs have completed, a season can be reset.  Reseting a season will archive the season as previously mentioned but for the new season, player stats and team stats will reset.

2. Only people with the unique key id can join a league and then selecting their team (which they can modify the team name as needed)

3. Only the commmission can delete a league.  Deleting a league will delete everything about the league including archived stats if they are present