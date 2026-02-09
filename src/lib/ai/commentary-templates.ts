/**
 * Commentary Template Data
 *
 * Template strings for play-by-play commentary fallback (REQ-AI-008).
 * Maps OutcomeCategory x CommentaryStyle x SituationTag to template pools.
 *
 * Placeholders: {batter}, {pitcher}, {team}, {opponent}
 *
 * Layer 0: Pure data, no logic.
 */

import type { CommentaryStyle } from '../types/ai';

export interface TemplatePool {
  readonly routine: readonly string[];
  readonly clutch: readonly string[];
  readonly dramatic: readonly string[];
}

export type OutcomeKey = string;

export type CommentaryTemplateMap = Record<
  OutcomeKey,
  Record<CommentaryStyle, TemplatePool>
>;

function pool(routine: string[], clutch: string[], dramatic: string[]): TemplatePool {
  return { routine, clutch, dramatic };
}

function allStyles(
  newspaper: TemplatePool,
  radio: TemplatePool,
  modern: TemplatePool,
): Record<CommentaryStyle, TemplatePool> {
  return { newspaper, radio, modern };
}

export const COMMENTARY_TEMPLATES: CommentaryTemplateMap = {
  // === HITS ===

  '15': allStyles( // SINGLE_CLEAN
    pool(
      ['{batter} singled to left field.', '{batter} lined a single into center.', '{batter} slapped a single through the right side.'],
      ['{batter} with a clean single! Base hit into left field.', 'A sharp single by {batter}, that one found a hole!', '{batter} reaches on a base hit to center!'],
      ['{batter} laces a single. Clean hit.', 'Single for {batter}. Nothing flashy, just a solid hit.', '{batter} with a knock to left.'],
    ),
    pool(
      ['{batter} delivered a clutch single.', '{batter} came through with a single when it mattered.', 'A timely single by {batter}.'],
      ['{batter} comes through in the clutch! A single!', 'Big hit by {batter}! A single right when they needed it!', '{batter} delivers! A base hit!'],
      ['{batter} with a clutch single. Big moment delivery.', 'When it matters most, {batter} delivers a single.', 'Clutch knock from {batter}. Ice in the veins.'],
    ),
    pool(
      ['{batter} singled sharply, electrifying the crowd.', '{batter} ripped a single in a tense moment.', 'A dramatic single by {batter} keeps hope alive.'],
      ['{batter} with a HUGE single! This crowd is going wild!', 'He came through! {batter} with a single! What a moment!', '{batter} keeps the rally alive with a single!'],
      ['{batter} with a single. That could change everything.', 'The single from {batter} -- this is getting interesting.', '{batter} finds a gap. Drama building.'],
    ),
  ),

  '16': allStyles( // SINGLE_ADVANCE
    pool(
      ['{batter} singled, advancing the runner.', '{batter} reached on a single; runners moved up.', 'A productive single by {batter}.'],
      ['{batter} singles and the runner advances! Runners on the move!', 'Base hit by {batter} and the runners are going!', '{batter} with a single and the baserunners take advantage!'],
      ['{batter} singles and moves the runners along. Heads-up baserunning.', 'Single from {batter}. Runners take the extra base.', '{batter} advances the runners with a single.'],
    ),
    pool(
      ['{batter} singled, moving runners into scoring position.', 'A key single by {batter} pushed runners forward.', '{batter} delivered with runners aboard.'],
      ['{batter} comes through! Single advances the runners into scoring position!', 'Big single by {batter}! Runners moving!', '{batter} with the big single! Runners advance!'],
      ['{batter} with a huge single, runners advance. Pressure mounting.', 'Runners move up on {batter}\'s single. Huge moment.', '{batter} keeps the line moving.'],
    ),
    pool(
      ['{batter} singled sharply, advancing runners in a critical spot.', '{batter} delivered a key single with runners in motion.', 'A dramatic single by {batter} sets the table.'],
      ['{batter} with a RUN-SCORING single! The runners are flying!', 'What a single by {batter}! Runners advance and the dugout is electric!', '{batter} laces one and the runners take off!'],
      ['{batter} threads the needle. Runners advance. This is happening.', 'Big-time single from {batter}. Runners in motion. Electric.', '{batter} delivers. Runners go. Wow.'],
    ),
  ),

  '17': allStyles( // DOUBLE
    pool(
      ['{batter} doubled to the gap.', '{batter} ripped a double into left-center.', '{batter} lined a double down the line.'],
      ['{batter} with a double! That ball split the outfielders!', 'A ringing double by {batter}! Rattling around in the corner!', '{batter} drives one into the gap for a double!'],
      ['{batter} ropes a double. Extra bases.', 'Double for {batter}. Right in the gap.', '{batter} with a double to the wall.'],
    ),
    pool(
      ['{batter} doubled with runners aboard, a key blow.', 'A clutch double by {batter} cleared the bases.', '{batter} came through with a double in a big spot.'],
      ['{batter} with a CLUTCH double! This game just changed!', 'HUGE double by {batter}! Runners are scoring!', '{batter} rips a double! What a time to come through!'],
      ['{batter} with a massive double. Game-changer.', 'Double from {batter} in the clutch. That one hurts.', '{batter} splits the gap for a double. Damage done.'],
    ),
    pool(
      ['{batter} drove a dramatic double off the wall.', '{batter} smashed a double that ignited the crowd.', 'A thunderous double by {batter} in the biggest moment.'],
      ['{batter} CRUSHES a double off the wall! This place is ROCKING!', 'OFF THE WALL! {batter} with a double! Can you believe it!', '{batter} with a screaming double! What drama!'],
      ['{batter} with a double off the wall. This is wild.', 'The double from {batter} -- everyone on their feet.', '{batter} absolutely SMOKES a double. Unreal.'],
    ),
  ),

  '18': allStyles( // TRIPLE
    pool(
      ['{batter} tripled to deep right-center.', '{batter} legged out a triple.', 'A triple by {batter}, racing into third standing up.'],
      ['{batter} with a TRIPLE! He is flying around the bases!', 'A triple for {batter}! The ball rolled all the way to the wall!', '{batter} hits it into the gap and he is going for three!'],
      ['{batter} legs out a triple. Pure speed.', 'Triple for {batter}. That was impressive.', '{batter} with a triple. Rolling into third easy.'],
    ),
    pool(
      ['{batter} tripled to open up the game.', 'A timely triple by {batter} put the go-ahead run on third.', '{batter} ripped a triple at the perfect time.'],
      ['{batter} with a HUGE triple! Go-ahead run at third!', 'TRIPLE by {batter}! What a time to hit one in the gap!', '{batter} legging it out for a triple! This crowd is on its feet!'],
      ['{batter} with a clutch triple. Ninety feet from glory.', 'Triple from {batter} in the clutch. What a moment.', '{batter} motors for a triple. Big-time speed.'],
    ),
    pool(
      ['{batter} drilled a dramatic triple to the wall.', '{batter} legged out a triple as the crowd roared.', 'A stunning triple by {batter} changes everything.'],
      ['{batter} drives one to the WALL! A TRIPLE! Unbelievable!', 'HE DID IT! {batter} with a TRIPLE! This crowd is INSANE!', '{batter} with a TRIPLE! Running like the wind!'],
      ['{batter} with a triple. You cannot script this.', 'A TRIPLE from {batter}. This game is bonkers.', '{batter} wheels around to third. Electric.'],
    ),
  ),

  '19': allStyles( // HOME_RUN
    pool(
      ['{batter} homered to left field.', '{batter} hit a home run over the center-field fence.', 'A home run by {batter}, a towering shot.'],
      ['{batter} hits a HOME RUN! Way back and it is GONE!', 'DEEP fly ball to center... HOME RUN! {batter} gets all of it!', '{batter} drives one deep... GONE! Home run!'],
      ['{batter} goes yard. No doubt about that one.', 'Bomb from {batter}. See you later.', '{batter} launched a homer. Exit velo looked nasty.'],
    ),
    pool(
      ['{batter} hit a go-ahead home run.', 'A crucial home run by {batter} put the team on top.', '{batter} delivered with a clutch homer.'],
      ['{batter} with a CLUTCH home run! This changes EVERYTHING!', 'HOME RUN {batter}! Right when they needed it most!', '{batter} CRUSHED it! A home run in the biggest spot!'],
      ['{batter} goes deep in the clutch. Absolutely massive.', 'Clutch homer from {batter}. Cold-blooded.', '{batter} with a homer when it matters. Built different.'],
    ),
    pool(
      ['{batter} blasted a dramatic home run that stunned the crowd.', '{batter} hit a towering home run in the most dramatic fashion.', 'A majestic home run by {batter} at the biggest moment.'],
      ['{batter} DRIVES one... DEEP to left... it is... GONE! HOME RUN! Pandemonium!', 'HOME RUN! {batter}! I DON\'T BELIEVE IT! The crowd is going CRAZY!', '{batter} with the MOONSHOT! HOME RUN! What a moment!'],
      ['{batter} just hit that ball into orbit. Absolutely insane.', 'BOMB from {batter}. This game is unreal right now.', '{batter} just changed everything with one swing. Unbelievable.'],
    ),
  ),

  '20': allStyles( // HOME_RUN_VARIANT
    pool(
      ['{batter} homered, a shot down the line.', '{batter} hit a home run that barely cleared the fence.', 'A home run by {batter}, just over the wall.'],
      ['{batter} hits one down the line... FAIR! HOME RUN!', 'Just barely over the fence! {batter} with a HOME RUN!', '{batter} muscles one out! Home run, just clearing the wall!'],
      ['{batter} sneaks one over the wall. Homer.', 'Just enough from {batter}. Home run.', '{batter} hits one that juuust gets out.'],
    ),
    pool(
      ['{batter} hit a critical home run that barely cleared the fence.', 'A go-ahead homer by {batter}, just over the wall.', '{batter} found just enough for a clutch home run.'],
      ['{batter} with a clutch homer! Just barely over! What a swing!', 'IT\'S GONE! {batter} with a home run in the clutch!', '{batter} muscles it out! Clutch home run!'],
      ['{batter} with a clutch dinger. Barely cleared it.', 'Home run from {batter}. Just enough. Just in time.', '{batter} gets one out. Huge.'],
    ),
    pool(
      ['{batter} hit a dramatic home run that barely cleared the fence.', '{batter} connected for a home run in dramatic fashion.', 'A home run by {batter} that just cleared the wall.'],
      ['{batter} hits it to the warning track... GONE! HOME RUN! Barely over!', 'Is it enough?! YES! {batter} with a HOME RUN! What drama!', '{batter} lifts a fly ball... it IS gone! HOME RUN!'],
      ['{batter} gets just enough. Home run. Unreal drama.', 'The ball from {batter} just clears the wall. Incredible.', '{batter}. Homer. Barely. WOW.'],
    ),
  ),

  // === OUTS ===

  '21': allStyles( // GROUND_OUT
    pool(
      ['{batter} grounded out to shortstop.', '{batter} hit a grounder to second, thrown out at first.', '{batter} grounded out to third.'],
      ['{batter} grounds one to short. Throw to first. He\'s out.', 'Ground ball by {batter}. Fielded cleanly, out at first.', '{batter} rolls one to the right side. Easy groundout.'],
      ['{batter} grounds out. Routine play.', 'Groundout for {batter}. Nothing there.', '{batter} puts one on the ground. Out.'],
    ),
    pool(
      ['{batter} grounded out with runners in scoring position.', '{batter} failed to deliver, grounding out weakly.', 'A disappointing ground out by {batter} in a big spot.'],
      ['{batter} grounds out. Missed opportunity there.', 'Ground ball from {batter}. Not what they needed.', '{batter} cannot come through. Groundout.'],
      ['{batter} grounds out in the clutch. Tough break.', 'Groundout from {batter}. Opportunity wasted.', '{batter} rolls over one. Not the time for that.'],
    ),
    pool(
      ['{batter} grounded out, ending a tense rally.', '{batter} grounded into a fielder\'s choice in a dramatic moment.', 'A groundout by {batter} quieted the crowd.'],
      ['{batter} grounds out! The rally is OVER!', 'Ground ball from {batter}... and the inning is DONE!', '{batter} rolls one to short. That does it.'],
      ['{batter} grounds out. Rally over. Heartbreaking.', 'Groundout ends it. {batter} rolls over one.', '{batter} cannot deliver. Groundout. Ouch.'],
    ),
  ),

  '22': allStyles( // FLY_OUT
    pool(
      ['{batter} flied out to center field.', '{batter} hit a fly ball to right, hauled in for the out.', '{batter} lifted a fly to left for the out.'],
      ['{batter} lifts a fly ball to center. Caught for the out.', 'Fly ball from {batter}. The outfielder settles under it. Out.', '{batter} hits a fly to right. Routine catch.'],
      ['{batter} flies out. Can of corn.', 'Flyout for {batter}. Routine.', '{batter} skies one. Easy out.'],
    ),
    pool(
      ['{batter} flied out deep, stranding the runners.', 'A deep fly by {batter} fell short of the warning track.', '{batter} just missed, flying out to the warning track.'],
      ['{batter} hits a deep fly ball... the outfielder makes the catch! Not quite enough!', 'A deep fly from {batter}... caught at the track! So close!', '{batter} drives one deep but it stays in the park!'],
      ['{batter} flies out deep. Almost. Just not enough.', 'Flyout at the track from {batter}. So close.', '{batter} juuust misses. Deep flyout.'],
    ),
    pool(
      ['{batter} flied out deep in a dramatic at-bat.', '{batter} hit a towering fly that was caught at the wall.', 'A deep fly by {batter} ended the threat.'],
      ['{batter} DRIVES one deep... back goes the fielder... CAUGHT at the wall!', 'What a drive by {batter}! But it\'s caught! So close to a home run!', '{batter} launches one to deep center... CAUGHT! What heartbreak!'],
      ['{batter} smokes one but it dies at the track. Brutal.', 'Deep flyout from {batter}. Robbed.', '{batter} hits it 395 feet. For an out. Baseball.'],
    ),
  ),

  '23': allStyles( // POP_OUT
    pool(
      ['{batter} popped out to the infield.', '{batter} hit a pop-up, caught by the catcher.', '{batter} popped up to short.'],
      ['{batter} pops one up. Easy catch in the infield.', 'Pop-up from {batter}. The shortstop has it.', '{batter} hits a lazy pop to the catcher.'],
      ['{batter} pops out. Weak contact.', 'Pop-up for {batter}. Nothing doing.', '{batter} gets under one. Pop out.'],
    ),
    pool(
      ['{batter} popped out weakly in a key at-bat.', 'A pop-up by {batter} wasted a scoring opportunity.', '{batter} could only manage a pop-up with runners on.'],
      ['{batter} pops it up! A wasted opportunity!', 'Just a pop-up from {batter}. Not what they needed.', '{batter} pops one up. The chance slips away.'],
      ['{batter} pops out. Missed the barrel. Bad timing.', 'Pop-up from {batter} in the clutch. Yikes.', '{batter} with a harmless pop-up. Rough.'],
    ),
    pool(
      ['{batter} popped out weakly in a tense moment.', '{batter} could only muster a pop-up with the game on the line.', 'A feeble pop-up by {batter} ended the drama.'],
      ['{batter} pops one up! That\'s all they could manage!', 'Pop-up from {batter}! The crowd groans!', '{batter} with a pop-up... and the threat is over!'],
      ['{batter} pops out. Not the moment for that. Devastating.', 'Pop-up ends it for {batter}. Painful.', '{batter} with a pop-up. You hate to see it.'],
    ),
  ),

  '24': allStyles( // LINE_OUT
    pool(
      ['{batter} lined out to the shortstop.', '{batter} hit a line drive right at the second baseman.', '{batter} lined out sharply to third.'],
      ['{batter} lines one hard but right at the fielder!', 'Line drive by {batter}! Caught! Hit it on the screws but right at him.', '{batter} smokes a liner but it\'s caught!'],
      ['{batter} lines out. Hit it hard, right at someone.', 'Lineout for {batter}. Unlucky.', '{batter} squares one up. Right at the fielder.'],
    ),
    pool(
      ['{batter} lined out hard, a tough break with runners on.', '{batter} hit a screaming liner, caught for the out.', 'A hard-hit lineout by {batter} ended the threat.'],
      ['{batter} RIPS a liner... CAUGHT! What bad luck!', 'Line drive from {batter}! Snagged! So close to a hit!', '{batter} smokes one but it\'s caught! Tough break!'],
      ['{batter} lines out hard. Unlucky. Hit it right.', 'Lineout from {batter}. Exit velo 105 but right at the fielder.', '{batter} scorches one. Caught. Baseball is cruel.'],
    ),
    pool(
      ['{batter} lined out sharply in a gut-wrenching at-bat.', '{batter} ripped a line drive that was speared by the fielder.', 'A scorching liner by {batter} was caught, ending the rally.'],
      ['{batter} HAMMERS a line drive... CAUGHT! What a grab!', 'A ROCKET from {batter}... snagged by the fielder! Unbelievable!', '{batter} hits it as hard as you can and it\'s CAUGHT!'],
      ['{batter} absolutely murdered that ball. Caught. Cruel game.', 'Lineout from {batter}. 108 off the bat. Sometimes...', '{batter} smashes one. Caught. The baseball gods are merciless.'],
    ),
  ),

  '25': allStyles( // STRIKEOUT_LOOKING
    pool(
      ['{batter} was called out on strikes.', '{batter} struck out looking.', 'A called third strike ended {batter}\'s at-bat.'],
      ['{batter} caught looking! Strike three called!', 'Called strike three! {batter} didn\'t swing!', '{batter} stands there as the umpire rings him up!'],
      ['{batter} goes down looking. Painted corner.', 'Called strike three on {batter}. Fooled.', '{batter} K\'d looking. Tough call.'],
    ),
    pool(
      ['{batter} struck out looking in a critical spot.', 'A called third strike on {batter} ended a rally.', '{batter} was caught looking with runners in scoring position.'],
      ['{batter} caught LOOKING! Strike three in the clutch!', 'Called strike three on {batter}! What a pitch by {pitcher}!', '{batter} frozen! Called out on strikes!'],
      ['{batter} goes down looking in the clutch. Brutal pitch.', 'Called K on {batter}. {pitcher} buried that one.', '{batter} frozen. Painted. Nothing you can do.'],
    ),
    pool(
      ['{batter} was rung up on a borderline pitch in dramatic fashion.', '{batter} stood frozen as the called third strike sealed the moment.', 'A called third strike on {batter} silenced the crowd.'],
      ['{batter} CAUGHT LOOKING! STRIKE THREE! What a pitch!', 'The ump rings him up! {batter} struck out LOOKING! Wow!', '{batter} frozen at the plate! CALLED strike three!'],
      ['{batter} caught looking. Devastating. The pitch was filthy.', 'K looking for {batter}. {pitcher} just took his lunch money.', '{batter} stunned. Called K. Absolute dagger.'],
    ),
  ),

  '26': allStyles( // STRIKEOUT_SWINGING
    pool(
      ['{batter} struck out swinging.', '{batter} went down on strikes.', 'A swinging strikeout for {batter}.'],
      ['{batter} swings and misses! Strike three!', 'A swing and a miss by {batter}! Struck out!', '{batter} whiffs on strike three!'],
      ['{batter} goes down swinging. K.', 'Strikeout for {batter}. Couldn\'t catch up.', '{batter} with the whiff. Punchout.'],
    ),
    pool(
      ['{batter} struck out swinging with runners on base.', 'A big strikeout of {batter} ended the threat.', '{batter} swung through strike three in a key moment.'],
      ['{batter} SWINGS and MISSES! Huge strikeout for {pitcher}!', 'Strike three SWINGING! {batter} goes down! Big out!', '{batter} whiffs in the clutch! {pitcher} pumps his fist!'],
      ['{batter} K\'s swinging in the clutch. {pitcher} won that battle.', 'Swinging K for {batter}. Big moment for {pitcher}.', '{batter} cannot catch up to the heater. Strikeout.'],
    ),
    pool(
      ['{batter} struck out swinging to end a dramatic at-bat.', '{batter} flailed at strike three in the biggest moment.', 'A dramatic swinging strikeout by {batter}.'],
      ['{batter} SWINGS through it! STRUCK OUT! What a moment for {pitcher}!', 'Strike three! {batter} goes down SWINGING! The crowd ERUPTS!', '{batter} swings over the top of it! STRIKEOUT! Incredible!'],
      ['{batter} whiffs. Strike three. Devastation.', 'Swinging K ends it for {batter}. {pitcher} is nasty.', '{batter} with a huge whiff. What a pitch. What a moment.'],
    ),
  ),

  // === WALKS / HBP ===

  '27': allStyles( // WALK
    pool(
      ['{batter} drew a walk.', '{batter} worked a base on balls.', 'A walk issued to {batter}.'],
      ['{batter} takes ball four. A walk.', 'Ball four and {batter} trots to first.', '{batter} draws a walk. Good eye at the plate.'],
      ['{batter} takes the free pass. Walk.', 'Walk for {batter}. Patient at-bat.', '{batter} with a base on balls.'],
    ),
    pool(
      ['{batter} drew a key walk.', 'A critical walk to {batter} loaded the bases.', '{batter} worked a patient walk in a big spot.'],
      ['{batter} with a walk! Huge patience in a big moment!', 'Ball four! {batter} takes the walk! Smart at-bat!', '{batter} draws a clutch walk!'],
      ['{batter} takes a walk in the clutch. Discipline.', 'Walk for {batter}. Great plate discipline when it matters.', '{batter} won\'t chase. Free pass.'],
    ),
    pool(
      ['{batter} drew a dramatic walk with the bases full.', '{batter} worked a tense at-bat into a walk.', 'A walk to {batter} in the most dramatic circumstances.'],
      ['{batter} takes ball four! A WALK! The run SCORES!', 'BALL FOUR! {batter} walks and forces in a run!', '{batter} draws a HUGE walk! What patience!'],
      ['{batter} walks. Nerves of steel. What an at-bat.', 'Walk from {batter}. Would not chase. Incredible discipline.', '{batter} earns a walk. Gutsy at-bat.'],
    ),
  ),

  '28': allStyles( // WALK_INTENTIONAL
    pool(
      ['{batter} was intentionally walked.', '{pitcher} issued an intentional walk to {batter}.', 'An intentional base on balls to {batter}.'],
      ['{batter} is being intentionally walked. Four wide ones.', 'They\'re putting {batter} on. Intentional walk.', '{pitcher} wants no part of {batter}. Intentional walk.'],
      ['{batter} gets the IBB. Respect.', 'Intentional walk for {batter}. Smart move.', '{batter} walked intentionally. Can\'t blame them.'],
    ),
    pool(
      ['{batter} was intentionally walked, a bold strategic decision.', 'An intentional walk to {batter} set up the force play.', '{pitcher} chose to intentionally walk {batter} with the base open.'],
      ['{batter} intentionally walked! A strategic move here!', 'They\'re putting {batter} on intentionally! Big decision!', '{pitcher} gives {batter} the free pass! Interesting strategy!'],
      ['{batter} gets the IBB. The strategy play.', 'Intentional walk for {batter}. Debatable call.', '{batter} walked on purpose. Bold strategy.'],
    ),
    pool(
      ['{batter} was intentionally walked in a pivotal moment.', 'An intentional walk to {batter} loaded the bases in dramatic fashion.', 'The decision to walk {batter} intentionally will be debated.'],
      ['{batter} INTENTIONALLY walked! They\'re loading the bases! Bold!', 'INTENTIONAL walk to {batter}! Can you believe this strategy!', 'They put {batter} on! An intentional walk here! Gutsy call!'],
      ['{batter} gets the IBB. Bases loaded. Here we go.', 'Intentional walk to {batter}. Risky. Very risky.', '{batter} walked intentionally. This could backfire spectacularly.'],
    ),
  ),

  '29': allStyles( // HIT_BY_PITCH
    pool(
      ['{batter} was hit by a pitch.', '{pitcher} plunked {batter} with a fastball.', '{batter} was awarded first base after being hit.'],
      ['{batter} is hit by the pitch! He takes first base.', 'Ouch! {batter} takes one off the arm. Hit by pitch.', '{batter} nicked by the pitch. Take your base.'],
      ['{batter} takes one for the team. HBP.', 'Hit by pitch on {batter}. Free base.', '{batter} gets plunked. Ouch.'],
    ),
    pool(
      ['{batter} was hit by a pitch, putting the tying run aboard.', 'A hit-by-pitch to {batter} loaded the bases.', '{batter} was plunked at the worst time for {pitcher}.'],
      ['{batter} hit by the pitch! A free baserunner in a big spot!', '{pitcher} hits {batter}! Not the time for that!', '{batter} takes one for the team! HBP with runners on!'],
      ['{batter} gets plunked in the clutch. Free base.', 'HBP on {batter}. {pitcher} misses badly there.', '{batter} hit by pitch. Rally continues.'],
    ),
    pool(
      ['{batter} was hit by a pitch in the tensest of moments.', '{pitcher} plunked {batter}, loading the bases dramatically.', 'A hit-by-pitch to {batter} added to the drama.'],
      ['{batter} DRILLED by the pitch! Free baserunner! Huge moment!', '{pitcher} hits {batter}! You can feel the tension!', '{batter} takes one! HBP! This crowd is buzzing!'],
      ['{batter} takes one off the hip. Free base. Drama intensifies.', 'HBP on {batter}. {pitcher} losing command at the worst time.', '{batter} gets drilled. Things are getting spicy.'],
    ),
  ),

  // === SPECIAL PLAYS ===

  '30': allStyles( // GROUND_OUT_ADVANCE
    pool(
      ['{batter} grounded out, advancing the runner.', 'A productive groundout by {batter} moved the runner up.', '{batter} grounded to second, advancing the runner to third.'],
      ['{batter} grounds out but advances the runner! Productive out!', 'Groundout from {batter} but the runner moves up!', '{batter} gives himself up to advance the runner!'],
      ['{batter} grounds out but moves the runner. Productive.', 'Productive groundout from {batter}. Job done.', '{batter} does the job. Runner advances.'],
    ),
    pool(
      ['{batter} made a productive out, advancing the tying run.', '{batter} grounded out but moved the runner into scoring position.', 'A key productive groundout by {batter}.'],
      ['{batter} gets the job done! Runner advances to scoring position!', 'Groundout but the runner moves! {batter} did his job!', '{batter} advances the runner with a groundout! Smart baseball!'],
      ['{batter} does the job in the clutch. Runner advances.', 'Productive out from {batter}. Runner at third now.', '{batter} moves the runner. Fundamental baseball.'],
    ),
    pool(
      ['{batter} made a productive out, advancing the go-ahead run.', '{batter} gave himself up to advance the winning run.', 'A selfless groundout by {batter} set up the potential winning run.'],
      ['{batter} advances the runner! Huge productive out!', 'The runner moves to third on {batter}\'s groundout! Ninety feet away!', '{batter} does the little things! Runner at third!'],
      ['{batter} puts the runner at third. Ninety feet. Here we go.', 'Productive out from {batter}. The winning run is 90 feet away.', '{batter} does the little things. Massive groundout.'],
    ),
  ),

  '31': allStyles( // SACRIFICE
    pool(
      ['{batter} laid down a sacrifice bunt.', '{batter} bunted, moving the runner over.', 'A sacrifice bunt by {batter} advanced the runner.'],
      ['{batter} lays down the sacrifice! Runner moves up!', 'A bunt by {batter}! The sacrifice is successful!', '{batter} bunts the runner over! Textbook sacrifice!'],
      ['{batter} bunts the runner over. Sacrifice.', 'Sac bunt from {batter}. Small ball.', '{batter} gives himself up with the bunt.'],
    ),
    pool(
      ['{batter} executed a key sacrifice bunt.', '{batter} bunted the go-ahead run into scoring position.', 'A well-placed sacrifice by {batter} moved the runner over.'],
      ['{batter} with the sacrifice bunt! Runner in scoring position!', 'Perfect bunt by {batter}! The sacrifice moves the runner!', '{batter} executes the sacrifice! Big moment!'],
      ['{batter} bunts the runner over in the clutch. Old school.', 'Sac bunt from {batter}. Giving up an out for position.', '{batter} with the sacrifice. Manufacturing runs.'],
    ),
    pool(
      ['{batter} executed a sacrifice bunt in the tensest of moments.', '{batter} perfectly placed a bunt to advance the potential winning run.', 'A textbook sacrifice by {batter} at the biggest moment.'],
      ['{batter} BUNTS! The sacrifice is down! Runner advances!', 'Perfect bunt by {batter}! What execution under pressure!', '{batter} with the sacrifice! Ninety feet from a run!'],
      ['{batter} with the sac bunt. Gutsy call. Perfect execution.', 'Sacrifice from {batter}. Small ball in the biggest moment.', '{batter} bunts perfectly. Runner at third. Tension building.'],
    ),
  ),

  '32': allStyles( // DOUBLE_PLAY
    pool(
      ['{batter} grounded into a double play.', '{batter} hit into a 6-4-3 double play.', 'A double play ball off the bat of {batter}.'],
      ['{batter} grounds into a DOUBLE PLAY! Two down!', 'Double play! {batter} grounds to short, over to second, on to first!', '{batter} hits into the twin killing! Inning over!'],
      ['{batter} hits into a double play. Inning over.', 'GIDP for {batter}. Rally killed.', '{batter} grounds into the DP. Brutal.'],
    ),
    pool(
      ['{batter} grounded into a rally-killing double play.', 'A double play off {batter}\'s bat ended the threat.', '{batter} hit into a double play at the worst possible time.'],
      ['{batter} hits into a DOUBLE PLAY! The rally is DEAD!', 'DOUBLE PLAY! {batter} kills the rally! Huge defensive play!', '{batter} grounds into the double play! What a momentum shift!'],
      ['{batter} hits into a double play. Rally over. Devastating.', 'GIDP from {batter} in the clutch. Oof.', '{batter} grounds into the DP. Worst possible outcome.'],
    ),
    pool(
      ['{batter} hit into a dramatic double play, ending the rally.', '{batter} grounded into a crushing double play.', 'A double play off {batter} ended all hope.'],
      ['{batter} grounds into the DOUBLE PLAY! It\'s OVER!', 'DOUBLE PLAY! {batter}! What a devastating moment!', '{batter} hits into the twin killing! HEARTBREAKING!'],
      ['{batter} hits into the DP. Heartbreaker. Game over.', 'Double play. {batter}. Pain. So much pain.', '{batter} with the GIDP. That is brutal.'],
    ),
  ),

  '33': allStyles( // DOUBLE_PLAY_LINE
    pool(
      ['{batter} lined into a double play.', '{batter} hit a line drive double play.', 'A line drive double play off {batter}\'s bat.'],
      ['{batter} lines one right at the fielder! He doubles off the runner! Double play!', 'Line drive caught! The runner was off the base! DOUBLE PLAY!', '{batter} hits a liner and the runner is doubled off! Twin killing!'],
      ['{batter} lines into a double play. Unlucky.', 'Line drive DP for {batter}. Runners caught.', '{batter} hit it hard. Right at him. Runner doubled off.'],
    ),
    pool(
      ['{batter} lined into a rally-ending double play.', 'A line drive double play off {batter} ended the threat.', '{batter} lined out and the runner was doubled off, ending the rally.'],
      ['{batter} lines it... CAUGHT! Runner doubled off! DOUBLE PLAY!', 'OH NO! {batter} lines into a double play! Rally OVER!', '{batter} with a liner... CAUGHT and doubled off! Devastating!'],
      ['{batter} lines into a DP. Rally killed instantly. Brutal.', 'Line drive DP from {batter}. Could not have been worse.', '{batter} smokes one. Caught. Runner doubled off. Ouch.'],
    ),
    pool(
      ['{batter} lined into a devastating double play at the worst time.', '{batter} hit a screaming liner that turned into a crushing double play.', 'A line drive double play off {batter} in the most dramatic fashion.'],
      ['{batter} LINES one... CAUGHT! Runner doubled off! DOUBLE PLAY!', 'A LINER from {batter}! CAUGHT! DOUBLED OFF! This crowd cannot believe it!', '{batter} with a SCREAMER... double play! DEVASTATING!'],
      ['{batter} lines into the DP. Everything just changed. Unbelievable.', 'Line drive double play from {batter}. The cruelest outcome.', '{batter} hit it 107 mph. Into a double play. Baseball is wild.'],
    ),
  ),

  '34': allStyles( // REACHED_ON_ERROR
    pool(
      ['{batter} reached on an error.', 'An error allowed {batter} to reach base.', '{batter} was safe on a fielding error.'],
      ['{batter} reaches on an ERROR! The fielder bobbled it!', 'Error in the field! {batter} is safe!', '{batter} reaches on a misplay! Error charged!'],
      ['{batter} reaches on an error. Gift.', 'Error puts {batter} on base. Free ride.', '{batter} reaches on an E. Sloppy.'],
    ),
    pool(
      ['{batter} reached on a costly error.', 'An error allowed {batter} to reach in a crucial spot.', '{batter} was given life by a fielding error.'],
      ['{batter} reaches on an ERROR! A costly mistake!', 'ERROR! {batter} is safe! That could be huge!', '{batter} gets on via error! A gift in a big spot!'],
      ['{batter} reaches on an error. Huge break.', 'Error puts {batter} on in the clutch. Momentum shift.', '{batter} catches a break on the error. Big moment.'],
    ),
    pool(
      ['{batter} reached on a dramatic error.', 'A critical error allowed {batter} to reach in the biggest moment.', '{batter} was given life by a costly miscue.'],
      ['{batter} reaches on an ERROR! The crowd goes WILD!', 'ERROR! A HUGE mistake! {batter} is SAFE!', '{batter} reaches on the error! What drama!'],
      ['{batter} reaches on an error. The chaos continues.', 'Error. {batter} is on. This game is insane.', '{batter} given life on the error. Unbelievable drama.'],
    ),
  ),

  '35': allStyles( // FIELDERS_CHOICE
    pool(
      ['{batter} reached on a fielder\'s choice.', 'A fielder\'s choice put {batter} on first.', '{batter} reached as the fielder threw out the lead runner.'],
      ['{batter} reaches on a fielder\'s choice. They got the lead runner.', 'Fielder\'s choice on {batter}\'s grounder. Lead runner is out.', '{batter} on via fielder\'s choice. The defense went for the lead runner.'],
      ['{batter} reaches on the FC. Lead runner erased.', 'Fielder\'s choice for {batter}. Trade-off.', '{batter} on first via FC.'],
    ),
    pool(
      ['{batter} reached on a fielder\'s choice, though the lead runner was erased.', 'A fielder\'s choice in a key moment forced out the lead runner.', '{batter} reached on a fielder\'s choice in a tense at-bat.'],
      ['{batter} on via fielder\'s choice! Lead runner cut down!', 'Fielder\'s choice! They get the lead runner but {batter} is safe!', '{batter} reaches but they got the big out at second!'],
      ['{batter} reaches on the FC. Runner erased. Trade-off.', 'Fielder\'s choice in the clutch. {batter} on. Runner out.', '{batter} on first but they erased the lead runner.'],
    ),
    pool(
      ['{batter} reached on a fielder\'s choice in a dramatic sequence.', 'A fielder\'s choice on {batter}\'s grounder added to the tension.', '{batter} reached as the dramatic fielder\'s choice played out.'],
      ['{batter} on via fielder\'s choice! The drama continues!', 'Fielder\'s choice! They get the lead runner! {batter} safe!', '{batter} reaches but the tying run is cut down!'],
      ['{batter} reaches on the FC. The tension is unbearable.', 'Fielder\'s choice. {batter} on. One out traded for another.', '{batter} on first via FC. Wild sequence.'],
    ),
  ),

  // === RARE EVENTS ===

  '36': allStyles( // STOLEN_BASE_OPP
    pool(
      ['The runner took an extra base on the play.', 'An aggressive baserunning play moved the runner up.', 'The runner advanced on the play.'],
      ['The runner is going! He takes the extra base!', 'Aggressive baserunning! The runner advances!', 'The runner takes off and takes the extra base!'],
      ['Runner advances. Heads-up baserunning.', 'Extra base taken on the play.', 'The runner gets aggressive on the bases.'],
    ),
    pool(
      ['The runner took an extra base in a key moment.', 'Aggressive baserunning moved the tying run into scoring position.', 'The runner advanced on the play, a bold move.'],
      ['The runner GOES! Huge baserunning play!', 'Aggressive on the bases! The runner advances in a big spot!', 'The runner takes the extra base! What a play!'],
      ['Runner takes the extra base in the clutch. Bold.', 'Aggressive baserunning when it matters.', 'Extra base. Big moment. Smart running.'],
    ),
    pool(
      ['The runner dashed forward in a dramatic baserunning play.', 'Aggressive baserunning added to the drama.', 'The runner took a bold extra base in the tensest of moments.'],
      ['The runner TAKES OFF! What a baserunning play!', 'AGGRESSIVE baserunning! The runner advances!', 'The runner goes! What heads-up play!'],
      ['Runner goes. Bold move. This game is incredible.', 'Extra base taken. The drama ratchets up.', 'Aggressive baserunning. Electric.'],
    ),
  ),

  '37': allStyles( // WILD_PITCH
    pool(
      ['{pitcher} uncorked a wild pitch.', 'A wild pitch by {pitcher} allowed the runner to advance.', 'Wild pitch. The runner moved up.'],
      ['{pitcher} with a WILD PITCH! The runner advances!', 'Wild one from {pitcher}! It gets by the catcher!', '{pitcher} bounces one! Wild pitch! Runner moves up!'],
      ['Wild pitch from {pitcher}. Free base.', '{pitcher} loses one. Wild pitch.', 'Wild pitch. Runner advances.'],
    ),
    pool(
      ['{pitcher} threw a costly wild pitch.', 'A wild pitch by {pitcher} moved the tying run into scoring position.', '{pitcher} bounced a critical wild pitch.'],
      ['{pitcher} with a WILD PITCH! The runner advances! Costly mistake!', 'Wild pitch from {pitcher}! Not the time for that!', '{pitcher} cannot find the plate! Wild pitch!'],
      ['Wild pitch from {pitcher} in the clutch. Costly.', '{pitcher} loses one. Runner advances. Big mistake.', 'Wild pitch. {pitcher} gift-wrapping a base.'],
    ),
    pool(
      ['{pitcher} threw a dramatic wild pitch.', 'A wild pitch by {pitcher} added fuel to the fire.', '{pitcher} bounced a wild pitch in the tensest of moments.'],
      ['{pitcher} bounces a WILD PITCH! The runner SCORES!', 'WILD PITCH from {pitcher}! The run comes in!', '{pitcher} cannot control it! Wild pitch! Run SCORES!'],
      ['Wild pitch from {pitcher}. Run scores. Unraveling.', '{pitcher} with a wild one. Disaster.', 'Wild pitch. The wheels are coming off for {pitcher}.'],
    ),
  ),

  '38': allStyles( // BALK
    pool(
      ['{pitcher} committed a balk.', 'A balk was called on {pitcher}.', 'Balk. The runners advance one base.'],
      ['{pitcher} is called for a BALK! Runners advance!', 'Balk! {pitcher} flinches and the runners move up!', 'The umpire calls a balk on {pitcher}!'],
      ['Balk on {pitcher}. Free base.', '{pitcher} balks. Runner advances.', 'Balk called. {pitcher} with the illegal move.'],
    ),
    pool(
      ['{pitcher} committed a costly balk.', 'A balk by {pitcher} gifted the runner a base in a key moment.', '{pitcher} was called for a balk at the worst time.'],
      ['{pitcher} called for a BALK! Runners advance! Costly!', 'A BALK by {pitcher}! Free base! Huge mistake!', '{pitcher} balks! Not the time for that!'],
      ['Balk on {pitcher} in the clutch. Free base. Costly.', '{pitcher} balks. Unforced error at the worst time.', 'Balk. {pitcher} with a mental miscue.'],
    ),
    pool(
      ['{pitcher} committed a balk in the most dramatic circumstances.', 'A balk by {pitcher} added to the tension.', '{pitcher} was called for a balk, electrifying the crowd.'],
      ['{pitcher} BALKS! The runner MOVES! What a blunder!', 'BALK called on {pitcher}! The crowd is going CRAZY!', '{pitcher} with a BALK! You cannot do that here!'],
      ['Balk on {pitcher}. You cannot make that up.', '{pitcher} balks. This game has everything.', 'Balk. In this moment. Unbelievable.'],
    ),
  ),

  '39': allStyles( // PASSED_BALL
    pool(
      ['A passed ball allowed the runner to advance.', 'The catcher let one get by. Passed ball.', 'Passed ball. Runner moves up a base.'],
      ['PASSED BALL! The runner advances! The catcher couldn\'t hang on!', 'The ball gets by the catcher! Passed ball! Runner moves up!', 'It got away from the catcher! Passed ball!'],
      ['Passed ball. Runner advances. Catcher couldn\'t handle it.', 'Passed ball. Free base.', 'The catcher loses it. Passed ball.'],
    ),
    pool(
      ['A passed ball moved the tying run into scoring position.', 'A costly passed ball allowed the runner to advance.', 'The catcher let a key pitch get by.'],
      ['PASSED BALL! The runner moves! Huge mistake!', 'The catcher cannot hang on! Passed ball in a huge spot!', 'Passed ball! The runner advances! Costly!'],
      ['Passed ball in the clutch. Runner advances. Brutal.', 'Catcher drops one at the worst time. Passed ball.', 'Passed ball. Free base at the worst moment.'],
    ),
    pool(
      ['A dramatic passed ball allowed the runner to advance.', 'The catcher let a crucial pitch get away.', 'A passed ball added to the drama of the moment.'],
      ['PASSED BALL! The runner ADVANCES! This crowd is ON ITS FEET!', 'The catcher DROPS it! Passed ball! What timing!', 'PASSED BALL! The run SCORES! Unbelievable!'],
      ['Passed ball. Runner scores. You cannot make this up.', 'Catcher loses it. Passed ball. This game is chaos.', 'Passed ball at the worst time. Wild.'],
    ),
  ),

  '40': allStyles( // SPECIAL_EVENT
    pool(
      ['An unusual play developed on the field.', 'A rare play unfolded.', 'Something unusual happened on the play.'],
      ['What an unusual play! You don\'t see that every day!', 'Something strange just happened on the field!', 'Well, that was unexpected! A rare play!'],
      ['Weird play there. Don\'t see that often.', 'Unusual play. Baseball is wild.', 'Something odd happened. As baseball does.'],
    ),
    pool(
      ['An unusual play developed at a crucial moment.', 'A rare occurrence changed the complexion of the game.', 'Something unexpected happened in a big spot.'],
      ['What a bizarre play in a crucial moment!', 'Did you see THAT?! An unusual play in the clutch!', 'You will NOT believe what just happened!'],
      ['Unusual play in the clutch. Baseball is unpredictable.', 'Something strange in a big moment. Only in baseball.', 'Weird play. Big impact. Classic baseball.'],
    ),
    pool(
      ['An extraordinary play unfolded in the most dramatic fashion.', 'A once-in-a-season play added to the drama.', 'Something truly unusual happened at the biggest moment.'],
      ['WHAT just HAPPENED?! An incredible play! I\'ve never seen anything like it!', 'UNBELIEVABLE! What a play! This crowd cannot believe what they just saw!', 'You have to see it to BELIEVE it! What a moment!'],
      ['Did that just happen? Unreal. Only in baseball.', 'Something extraordinary just occurred. This game is legendary.', 'That just happened. I have no words.'],
    ),
  ),
};
