/**
 * Departments, their worlds and their events — transcribed from the
 * "CUBYC Fest 2027 · Departmental Events" sheet.
 *
 * Each key is the body the department lives on (a planet, the Moon or the space station).
 * The sun is CUBYC itself — the host campus — and its page is the hub of every department.
 * ORDER is the tour order of the pages (← / →): the sun, then outward by orbit.
 *
 * Event fields:
 *   format   team size / participation
 *   faculty  event faculty in-charge          (optional)
 *   student  student in-charge + phone        (optional)
 *   summary  one-line pitch shown on cards
 *   rules    'Label: text' strings — the label renders as a heading.
 *            Lines starting with '- ' render as a bullet list.
 */

export const DEPARTMENTS = {
  // The sun: CUBYC, the host. Not a department — its page is the hub of all of them.
  sun: {
    hub: true,
    name: 'CUBYC',
    short: 'CUBYC',
    org: 'Christ University Yeshwanthpur Campus',
    facultyLabel: 'Host',
    faculty: 'Christ University · Yeshwanthpur Campus',
    tagline: 'Christ University Yeshwanthpur Campus',
    intro: 'The star every world orbits. Our first flagship fest brings ten departments and one orbital stage together for two days of competition, culture and ambition.',
    events: [],
  },

  station: {
    name: 'Cultural Events',
    short: 'SWO',
    org: 'Conducted by SWO',
    facultyLabel: 'Coordinating office',
    faculty: 'SWO',
    tagline: 'The orbital stage — music, dance and theatre.',
    intro: 'Every world tunes in to the station. Six cultural events: two Battles of Bands, Indian group dance, street play, mime and solo dance.',
    events: [
      {
        name: 'Battle of Bands (Western)',
        format: 'Band of 5–9',
        student: { name: 'Deberko Das', phone: '9391253577' },
        summary: 'Up to three songs, no backing tracks — just your band, live.',
        rules: [
          'Time: 12 + 3 minutes (from sound check).',
          'Band size: Minimum 5 and maximum 9 members per team.',
          'Songs: Maximum of 3 songs within the time limit.',
          'Equipment: A drum kit will be provided.',
          'Individual prizes: Best song, best original composition, best vocalist, best lead guitarist, best drummer, best bassist, best keyboardist and best rhythm guitarist.',
          'Not allowed: Sequencing, samples, backing tracks and mashups.',
          'Vocalists: A maximum of 3 vocalists are allowed.',
          'Not adhering to these rules will lead to disqualification.',
        ],
      },
      {
        name: 'Battle of Bands (Indian)',
        format: 'Band of 5–10',
        summary: 'Three songs, one Indian instrument at the core, zero backing tracks.',
        rules: [
          'Time: 12 + 3 minutes (from sound check).',
          'Band size: Minimum 5 and maximum 10 members per team.',
          'Songs: Maximum of 3 songs within the time limit.',
          'Individual prizes: Best song, best original composition, best Indian instrumentalist, best rhythm guitarist, best drummer, best vocalist, best bassist, best lead guitarist and best keyboardist.',
          'Equipment: A drum kit will be provided. An Octopad or equivalent is allowed.',
          'Compulsory: At least 1 Indian instrument.',
          'Not allowed: Sequencing, samples, backing tracks and mashups.',
          'Vocalists: A maximum of 3 vocalists are allowed.',
          'Not adhering to these rules will lead to disqualification.',
        ],
      },
      {
        name: 'Indian Group Dance (Non-Theme)',
        format: 'Team of 8–15',
        summary: 'Indian dance forms, Bollywood and contemporary — up to three songs, one stage.',
        rules: [
          'Team size: Minimum 8 and maximum 15 members per team.',
          'Dance forms: Only Indian dance forms (including Bollywood and contemporary) are allowed.',
          'Music: Mixing of songs is allowed (maximum 3 songs).',
          'Time: 6 + 1 minutes on stage.',
          'Conduct: Vulgarity in movements and costume will not be entertained.',
          'Lifts: Boys and girls performing lifts together is strictly not allowed.',
          'Originality: Instagram reel choreographies are not permitted.',
        ],
      },
      {
        name: 'Street Play',
        format: 'Team of 8–25',
        summary: 'An English street play with multilingual jingles — no loudspeakers, all voice.',
        rules: [
          'Duration: 8 + 2 minutes (including performance-area entry and exit).',
          'Language: English. The dialogues and narration of the play must be in English.',
          'Jingles: May be in any language. Every team must sing jingles in at least 4 languages.',
          'Team size: Maximum of 25 participants.',
          'Loudspeakers: Not permitted.',
          'Formations: 10 ft is the maximum permitted height for any formation.',
          'Lifts: Boys and girls lifts are not allowed.',
          'Conduct: Vulgarity in movements and costume will not be entertained.',
          'Prohibited: Fire and water on stage, and any powdered colours or paints.',
          'Props: Allowed, but must not be heavy, inflammable or dangerous.',
          'Stage: Teams must clear and clean the stage after their performance.',
          'Script: A draft must be submitted to the SWO Office at least 3 days before the event.',
          "The judges' decision will be final.",
        ],
      },
      {
        name: 'Mime',
        format: 'Team of 6–8',
        summary: 'Say everything without a word — and without props.',
        rules: [
          'Team size: Maximum 8 members per team, including the musicians.',
          'Time: 7 + 1 minutes.',
          'Props: The use of props is not allowed.',
          'Music: May be live (single instrument) or pre-recorded.',
          'Conduct: Vulgarity and obscenity in movement are strictly prohibited.',
        ],
      },
      {
        name: 'Indian Film and Folk Dance Solo',
        format: 'Individual',
        summary: 'One dancer, one song, two categories: Film/Folk and Western.',
        rules: [
          'Time: 2 + 1 minutes.',
          'Categories: Film/Folk and Western. Students can participate in both categories.',
          'Music: No medleys. Only one song is permitted.',
          'Props: Minimal props allowed.',
          'Conduct: Vulgarity in movements and costume will not be entertained. Modesty in clothing is to be followed.',
          'Prelims: There will be prelims, depending on the number of participants.',
        ],
      },
    ],
  },

  mercury: {
    name: 'Economics',
    short: 'ECO',
    faculty: 'Dr. Sajitha A',
    tagline: 'Markets, money and pop culture at orbital speed.',
    intro: 'The fastest world in the system. Trade a live mock-stock floor and take on a pop-culture quiz where every answer hides an economic idea.',
    events: [
      {
        name: 'Bulls and Bears (Mock Stock)',
        format: 'Individual',
        faculty: 'Dr. Edith Jacob',
        student: { name: 'Parth Dhawan', phone: '7016212215' },
        summary: 'Trade ₹10,00,000 of virtual capital through two news-driven sessions.',
        rules: [
          'Participation: Individual.',
          "Capital: Virtual capital of ₹10,00,000 on the organisers' simulation platform (on your own phone or laptop).",
          'Format: Two trading sessions of 45 minutes each, with a 10-minute break. News flashes every 5 minutes move prices.',
          'Trading rules: Buy and sell only (no short selling). Maximum 30% of capital in any single stock. Brokerage of 0.1% per trade. Minimum 5 trades to qualify.',
          'Prohibited: Multiple logins, collusion between participants, and the use of outside apps or help.',
          'Winning: Highest portfolio value (cash + holdings) at the close of session 2.',
          'Tie-break: Higher portfolio value at the end of session 1.',
          'General: All general rules of the fest apply.',
        ],
      },
      {
        name: 'Plot Twist (Pop Culture Quiz)',
        format: 'Team of 2–3',
        faculty: 'Dr. Neelu S Kumar',
        student: { name: 'Parv Saxena', phone: '9993848992' },
        summary: 'Pop culture from the 1990s to today — read through an economist’s lens.',
        rules: [
          'Team size: 2–3 members.',
          'Content: Pop culture from the 1990s to the present (movies, series, music, memes, internet trends). At least two-thirds of the questions link pop culture to an economic idea such as pricing, demand, scarcity, incentives, behavioural economics, or the platform and influencer economy — why ticket prices for a film surged, not who directed it.',
          'Prelims (20 min): Written + audio-visual, 25 questions. The top 6 teams go to the stage.',
          'Stage Round 1 — Jeopardy (20–30 min): 5 categories × 5 values (100–500). A wrong answer costs half the value.',
          'Stage Round 2 — Connect the Clue: Up to 4 clues per question; points fall with each clue: 40 / 30 / 20 / 10. No negative marking.',
          'Stage Round 3 — Auction: Teams bid from their own score on a hidden category. Correct = + bid; wrong = − bid. Maximum bid = current score.',
          'Final Showdown: 60-second rapid fire per team, +10 per correct answer.',
          "Rules: No phones or smartwatches. The quizmaster's decision is final.",
          'Tie-break: Sudden-death buzzer question.',
          'General: All general rules of the fest apply.',
        ],
      },
    ],
  },

  venus: {
    name: 'Psychology',
    short: 'PSY',
    faculty: 'Dr. Athira OS',
    tagline: 'Minds, motives and mysteries.',
    intro: 'The brightest world hides the deepest secrets. Solve a campus-wide case, then draw, act and decode your way through the human mind.',
    events: [
      {
        name: 'Case 404',
        format: 'Team of 4–6',
        summary: 'Follow the clue trail, profile the suspects and name the culprit, motive and method.',
        rules: [
          'Overview: Case 404 is a high-stakes investigative challenge where teams follow clues, analyse suspects and piece together evidence to identify the culprit, motive and method within a limited time.',
          'Format: 60 minutes. Opens with a video briefing and suspect profiles. Teams follow a clue trail across campus (academic blocks excluded).',
          'Final accusation: At the final location, submit one written accusation — culprit, motive and method. Only one submission per team.',
          "Hints: Maximum 2; each adds 5 minutes to the team's time.",
          'Scoring (100): Correct culprit 40, justification 30, time rank 30 (1st 30, 2nd 25, 3rd 20, others 10).',
          'Rules: Do not move or hide clues meant for other teams. Do not enter areas outside the boundary. No phones except for the official clue app (if used).',
          'If no team finishes: Teams are ranked by number of clues solved, then by quality of justification.',
          'General: All general rules of the fest apply.',
        ],
      },
      {
        name: 'Crack the Psyche',
        format: 'Team of 2–3',
        summary: 'Draw, act and decode emotions, thrillers and psychological concepts.',
        rules: [
          'Overview: An exciting psychology-based challenge where teams draw, act and decode their way through emotions, thriller movies and psychological concepts.',
          'Format: 45–60 minutes. Four rounds — Sketch & Guess, Feel It!, Reel Thriller and Psyche Unlocked. All teams participate in each round.',
          'Round 1 — Sketch & Guess: Participants draw general concepts, objects, places or everyday activities. Own team gets 60 seconds to guess. Correct answer: 5 points. If unanswered, other teams may steal for 3 points.',
          'Round 2 — Feel It!: One participant acts out an emotion using only facial expressions and body language. No speaking or sounds. Own team gets 60 seconds. Correct answer: 10 points; successful steal: 5 points.',
          'Round 3 — Reel Thriller: One participant acts out the name of a thriller, psychological thriller, mystery or horror movie. No speaking, sounds or written clues. Own team gets 90 seconds. Correct answer: 15 points; successful steal: 7 points.',
          'Round 4 — Psyche Unlocked: Participants receive psychological concepts, disorders or famous psychological experiments. The card specifies whether the answer must be drawn or acted. Own team gets 90–120 seconds. Correct answer: 25 points; successful steal: 12 points.',
          'Steal: If the performing team fails to identify the answer in time, the moderator announces “Steal.” The first eligible team to answer correctly receives the steal points.',
          'Scoring: 55 points from successful own-team answers (Round 1 – 5, Round 2 – 10, Round 3 – 15, Round 4 – 25), plus any steal points.',
          'Rules: The performer cannot directly reveal the answer. No phones, internet, notes, written clues, spelling, letters or numbers. Drawing rounds prohibit verbal clues; acting rounds prohibit speaking and sounds.',
          'Role rotation: The performer should rotate across rounds so that every team member gets a turn.',
          'Psychological content: Disorders must be represented sensitively through their symptoms or conceptual features. Participants must not mock, imitate or caricature people with mental health conditions.',
          'Tie-breaker: A 30-second Psychology Showdown. The team that correctly identifies its concept first wins.',
          'General: Judges and moderators have the final decision in case of disputes. All general rules of the fest apply.',
        ],
      },
    ],
  },

  earth: {
    name: 'Computer Science',
    short: 'CS',
    faculty: 'Dr. Kokilavani T & Dr. Stephen R',
    tagline: 'Code, compete, capture the flag.',
    intro: 'The world that runs on signal. Esports on the big screen, a three-hour Capture the Flag and a six-hour AI prompt war.',
    events: [
      {
        name: 'Cybertronian Wars (Gaming)',
        format: 'Valorant 5 (+1) · BGMI 4',
        faculty: 'Dr. Kokilavani T & Dr. Stephen R',
        student: { name: 'Aarav Chawla', phone: '9617345111' },
        summary: 'BGMI and Valorant custom rooms, with the finals streamed on the big screen.',
        rules: [
          'Team size: Squad of 5 (+1 substitute) for Valorant and squad of 4 for BGMI.',
          'Game titles: BGMI and Valorant. For both games, participants bring their own phone and laptop.',
          'Devices: Phone for BGMI (your own, fully charged — no tablets, emulators, triggers or external controllers). Laptop for Valorant (your own laptop and charger).',
          'Format: Prelims of 2 matches. The top 8 teams play 3 final matches in custom rooms created by the organisers.',
          'Points: Placement — 1st 10, 2nd 6, 3rd 5, 4th 4, 5th 3, 6th 2, 7th–8th 1. Each finish/kill earns 1 point.',
          'Fair play: Hacks, scripts, teaming with other squads or account sharing lead to disqualification. No re-match for individual disconnects; a re-match only if a server issue hits most teams.',
          'Tie-break: Total finishes, then best placement in the last match.',
          'Crowd element: Final matches are streamed on the big screen.',
          'General: All general rules of the fest apply.',
        ],
      },
      {
        name: 'Transwarp Protocol (Capture the Flag)',
        format: 'Team of 3',
        faculty: 'Dr. Kokilavani T & Dr. Stephen R',
        student: { name: 'Alex', phone: '8778616699' },
        summary: 'A three-hour Jeopardy-style CTF — web, crypto, forensics, OSINT and reversing.',
        rules: [
          'Team size: 3 members.',
          'Format: Jeopardy-style CTF on an online platform. Duration: 3 hours.',
          'Challenges: Web technologies, cryptography, digital forensics, open-source intelligence (OSINT), reverse engineering and miscellaneous technical topics, worth 100 to 500 points by difficulty.',
          'Flag format: CUBYC{...}',
          'Hints: Available on the platform; each hint costs points.',
          'Rules: Own laptops. Internet allowed for research. Sharing flags between teams, attacking the platform or other teams, or brute-forcing the flag checker leads to disqualification.',
          'Winning: Highest points. Tie: the team that reached the score first.',
          'Reporting: Promptly report technical issues, challenge ambiguities or scoring discrepancies to the organisers. Their decisions on administration and scoring are final.',
          'General: All general rules of the fest apply.',
        ],
      },
      {
        name: 'Prime Prompt (AI Prompt Wars)',
        format: 'Team of 2',
        summary: 'Six hours of prompt engineering, creative AI and constraint-based challenges.',
        rules: [
          'Team size: 2 members.',
          'Duration: 6 hours.',
          'Categories: Prompt Engineering, Creative AI Challenge, Constraint-Based Prompting, Prompt Optimisation.',
          'Evaluation: Output accuracy & relevance 30%, prompt quality 25%, problem solving 20%, creativity 15%, efficiency 10%.',
          'Rules: Use your own laptops. AI tools are allowed. Sharing prompts or solutions is prohibited. Pre-prepared prompts are restricted.',
          'Winning: Highest points. Ties are settled on completion time, output quality and prompt efficiency.',
          'General: All general rules of the fest apply.',
        ],
      },
    ],
  },

  moon: {
    name: 'Mathematics',
    short: 'MATH',
    faculty: 'Dr. Rohith Raja M',
    tagline: 'Logic is the strongest gravity.',
    intro: 'The quiet companion that moves the tides. A maths-themed Monopoly and a Sudoku event with a bidding twist.',
    events: [
      {
        name: 'Monomatics',
        format: 'Team of 3',
        faculty: 'Rohith Raja',
        student: { name: 'Parvathy Sudheer', phone: '9074796572' },
        summary: 'Monopoly meets mathematics — answer to buy, out-think to win.',
        rules: [
          'Team size: 3 members.',
          'Concept: A mathematics-based competitive event combining problem-solving, strategic decision-making, property acquisition and financial management.',
          'Format: The event lasts 2 hours and each team goes twice around the Monopoly board. Teams start with 1,500 points and aim to accumulate the highest wealth.',
          'Gameplay: Teams roll a die to move around a maths-themed board. To purchase an unowned property, teams must correctly answer a maths question within 60 seconds. Teams landing on owned properties pay rent.',
          'UNO cards: Chance spaces feature attack and movement effects, while Community Chest spaces bring financial gains or losses through rewards and maintenance fees.',
          'Bonus: Teams receive 200 points after completing one full round of the board.',
          'Evaluation: The winner has the highest final wealth — remaining cash plus the value of owned properties. In a tie, the team with more properties wins.',
          "Rules: Participants must adhere to the timings and game instructions. The event heads' decisions on disputes and clarifications are final and binding.",
          'General: Participants are expected to maintain fair play, teamwork and proper conduct throughout the event.',
        ],
      },
      {
        name: 'Auction Sudoku',
        format: 'Team of 3',
        faculty: 'Rohith Raja',
        student: { name: 'Vansh Modi', phone: '9000248110' },
        summary: 'Killer Sudoku, rapid fire and a topic auction where you bid with time.',
        rules: [
          'Team size: 3 members.',
          'Concept: Combines analytical problem-solving, Sudoku, mathematical topic selection, strategic bidding and time management.',
          'Format: Three stages — Round 1 (Killer Sudoku), an Elimination Round (Rapid Fire), then Round 2 (Topic Auction & Timed Sudoku).',
          'Round 1 — Killer Sudoku: Teams solve a Killer Sudoku grid using maths questions for each cage instead of given sums. The top 6 teams qualify directly for Round 2; the next 10 enter the Rapid Fire elimination round. All other teams are eliminated.',
          'Elimination Round — Rapid Fire: Each of the 10 teams has 60 seconds to answer as many questions as possible. The top 2 teams qualify for Round 2.',
          'Round 2 — Topic Auction & Timed Sudoku: The 8 qualified teams bid on 8 mathematics topics by offering the least solving time. The lowest bid earns the right to solve that topic within the time bid.',
          'Time ratio: Total time taken to solve ÷ total time available for the question set and the Sudoku grid. The team with the lowest time ratio and a correctly solved grid wins.',
          'Evaluation: Round 1 — correctness and speed (ties broken on time). Elimination — most correct answers. Round 2 — time ratio and correct completion of the grid.',
          'Rules: Follow the given timings. Mobile phones, calculators, ChatGPT and other AI tools are prohibited. Teams must maintain decorum throughout.',
          'General: Follow the auction instructions and timelines. The decision of the event heads on any question or rule is final and binding.',
        ],
      },
    ],
  },

  mars: {
    name: 'Commerce',
    short: 'COM',
    faculty: 'Dr. Sudha E',
    tagline: 'Leadership forged under pressure.',
    intro: 'The red planet tests nerve. A sustainability-driven hunt for the best manager and a four-round HR challenge across two days.',
    events: [
      {
        name: 'Best Manager (SustainaQuest)',
        format: 'Individual',
        faculty: 'Dr. Kamatchi Preethi',
        student: { name: 'Kabeer Shobhit Vaish', phone: '7830404016' },
        summary: 'Quiz, crisis response, crisis defence and a stage final — over two days.',
        rules: [
          'Participation: Individual.',
          'Day 1 · Round 1 (30 min): An objective test on business general knowledge, management aptitude and sustainability, including scenario-based questions. The top 30% qualify for Round 2A. Scores are used only for shortlisting.',
          'Day 1 · Round 2A — Written Crisis Response (15 min): All shortlisted participants receive the same business crisis and independently submit a written response with their decision, justification and practical action plan, considering sustainability implications. The top 12% qualify for Round 2B. Judging: decision quality 40, reasoning & justification 30, feasibility of action plan 30 (total 100). Scores are used only for shortlisting.',
          'Day 1 · Round 2B — Crisis Defence: Participants defend their Round 2A response — 3 minutes of presentation and 2 minutes of questions from the judges on feasibility, business impact and sustainability. The top 6% qualify for the stage final. Judging: decision quality 40, reasoning & justification 30, communication 30 (total 100).',
          'Day 2 · Round 3 — Stage Final: The six finalists compete in two on-stage challenges. A. Rapid-fire questions (2 min per participant) on business awareness, management knowledge and sustainability — 50 marks. B. Surprise management task (2 min per participant), revealed on stage, judged on decision-making, reasoning, adaptability and communication — 50 marks.',
          'Final score: Round 2B + Round 3, out of 200. The highest combined score is declared Best Manager – SustainaQuest. Ties are resolved with an additional rapid-fire set.',
          'Deadlines and deliverables: Completing and submitting each round you are eligible for is compulsory; failure to submit means disqualification. Late submissions attract progressive deductions announced before the round. Presentations and stage tasks stop at the time limit. Relevant additional deliverables are encouraged where the round permits, within the allotted time and published criteria.',
          'General: All general rules of the fest apply.',
        ],
      },
      {
        name: 'Percepta (HR)',
        format: 'Team of 2',
        faculty: 'Dr. Rekha N',
        student: { name: 'Harishna K L', phone: '9944156149' },
        summary: 'Quiz, war room, role-play and a Shark Tank pitch — for future people leaders.',
        rules: [
          'Team size: 2 members.',
          'Day 1 · Round 1 — HRX, a competitive HR quiz: 20 written multiple-choice questions in 20 minutes, 5 each on HR Core, HR in Action, People & Organisation and HR Dilemmas. The top 12 teams qualify.',
          'Day 1 · Round 2 — HR War Room: “You are the HR leadership team. The organisation is in trouble. Fix it.” Teams receive a complex organisational crisis with multiple HR problems: 20 minutes to solve the case, 8 minutes to prepare, 7 minutes to present and 2 minutes of Q&A. Judging (5 marks each): problem identification, HR knowledge & application, practicality of solutions, presentation & teamwork, rebuttal.',
          'Day 1 · Round 3 — HR Trap: “The obvious answer is not always the right answer.” Teams are shuffled and given two situations to role-play, with roles shuffled among members. Individuals are ranked on performance and HR relevance. 7 minutes to prepare + 3 minutes per scenario. Judging (5 marks each): understanding the situation, application of HR concepts, critical thinking, communication & role portrayal, adaptability & spontaneity.',
          'Day 2 · Round 4 — HR Shark Tank: “Pitch the next big HR innovation.” Develop an HR product or service that solves HR functions. 5-minute pitch + 3 minutes Q&A, covering the HR problem, target users, solution, unique value proposition, business model, implementation, ethical concerns and ROI. Judging (5 marks each): problem relevance, innovation & originality, feasibility & business model, solution & value proposition, pitch delivery & Q&A.',
          'Rules: No phones or laptops during the quiz and role-play. Laptops may be used to prepare the case presentation.',
          'General: All general rules of the fest apply.',
        ],
      },
    ],
  },

  jupiter: {
    name: 'Media Studies',
    short: 'MEDIA',
    faculty: 'Dr. Julia Oinam',
    tagline: 'Stories made in six hours flat.',
    intro: 'The giant that pulls every story into orbit. Shoot a film on campus in six hours, then find the imposter hiding in your team.',
    events: [
      {
        name: '6-Hour Filmithon',
        format: 'Group · up to 5',
        faculty: 'Dr. Rajashekar D',
        student: { name: 'Promod Komanduri', phone: '9014778837' },
        summary: '6 hours. One story. One film — shot entirely on campus.',
        rules: [
          'Participation: Group event, maximum 5 members per team.',
          'Theme & challenge: A surprise theme, element or prop is revealed to all teams at 9:00 AM on Day 1. The film must be based on it.',
          'Time: The film must be conceived, shot, edited and submitted within 6 hours of the reveal — by 3:00 PM.',
          'Location: All footage must be shot on campus during the fest.',
          'Film duration: 3–5 minutes, including credits.',
          'Original footage: All footage must be captured during the Filmithon. Pre-recorded footage, including stock video, is not permitted.',
          'Other assets: Music, sound effects, images and graphics must be original or copyright-free / appropriately licensed.',
          "AI usage: AI may be used for ideation only. AI-generated video, audio or visuals cannot replace the team's production work.",
          'Submission: The final film and project details must be submitted before the 6-hour deadline. Late submissions may be disqualified.',
          'Judging: Storytelling, creativity, technical execution, use of the challenge element, time management.',
        ],
      },
      {
        name: 'Imposter',
        format: 'Team of 2–3',
        faculty: 'Dr. Manas K',
        student: { name: 'Kanishka Sharma', phone: '9306115754' },
        summary: 'One team. One mission. One imposter.',
        rules: [
          'Participation: Group event. Players are divided into teams.',
          'Roles: One or more players are secretly assigned as imposters.',
          'Missions: Imposters receive a hidden identity or mission. All other players receive the common task.',
          'Gameplay: Teams complete a series of creative challenges, discussing, performing and completing each one while watching for suspicious behaviour. Imposters must blend in, deceive and subtly disrupt the team without being caught.',
          'Time limit: Each round has a strict time limit.',
          'Secrecy: Players cannot reveal their assigned role. Secret signalling is not allowed.',
          'Voting: At the end of each round, players vote to eliminate the suspected imposter.',
          'Imposter wins: By surviving the rounds or successfully sabotaging the task.',
          'Team wins: By exposing all imposters before the final round.',
          "Fair play: No cheating, secret signalling or outside assistance. The Game Master's decision is final.",
        ],
      },
    ],
  },

  saturn: {
    name: 'English & Cultural Studies',
    short: 'ENG',
    faculty: 'Dr. Rima Bhattacharya',
    tagline: 'Characters on trial, timelines on the line.',
    intro: 'The ringed world of stories. Argue literature in a mock high court, then convince the Time Keeper whether a character should return or remain.',
    events: [
      {
        name: 'Literature Court Room',
        format: 'Team of 3',
        faculty: 'Dr. Rima Bhattacharya',
        student: { name: 'Jowin Joice', phone: '8281153955' },
        summary: 'Case analysis, a simulated high-court trial and a press conference.',
        rules: [
          'Participation: Team event.',
          'Format: Three rounds, each scored out of 25 marks — Round 1: Case Analysis; Round 2: The Courtroom Trial; Round 3: The Press Conference.',
          'Round 1 — Case Analysis (25 marks): Teams review the given case details or questions, diagnose the core legal issues and submit structured solutions within the stipulated time, testing analytical skill, legal reasoning and domain knowledge.',
          'Judging — Round 1: Analytical accuracy & legal reasoning 5; clarity of problem identification 5; depth of research & argument framing 5; feasibility & structure of solutions 5; timeliness & presentation 5.',
          'Round 2 — The Courtroom (25 marks): Segment 1 is a preliminary legal quiz and mystery puzzle under strict time limits; only the highest-scoring teams advance, and the top 3 earn an advantage in the trial (extra prep time, online research during court, etc.). Segment 2 is a simulated high-court trial with judges, defence and prosecution — teams present arguments, examine and cross-examine evidence or witnesses, cite precedents and respond to the bench under strict procedural decorum.',
          "Judging — Round 2: Application of laws & precedents 5; strength of arguments & cross-examination 5; courtroom etiquette & decorum 5; handling of the bench's questions 5; clarity, confidence & articulation 5.",
          'Round 3 — The Press Conference (25 marks): Surviving teams face a simulated media and stakeholder press conference, defending their decisions, verdicts or stances. A panel of media personnel and experts cross-examines them on societal, ethical and practical implications. The best-performing team wins.',
          'Judging — Round 3: Clarity & logic of justification 5; poise under aggressive questioning 5; handling curveballs & crisis scenarios 5; public relations & communication strategy 5; ethical & societal impact awareness 5.',
        ],
      },
      {
        name: 'Convince the Time Keeper',
        format: 'Team of 2',
        faculty: 'Dr. Rima Bhattacharya',
        student: { name: 'Greeshma G', phone: '9843092000' },
        summary: 'A literary character, pulled into the present: return or remain?',
        rules: [
          'Format: Two rounds — Round 1: Literary Character Quiz; Round 2: Convince the Time Keeper.',
          "Round 1 — Literary Character Quiz (15 marks): A series of “Who Am I?” questions with clues about a character's personality, background, relationships, actions or literary work. Questions progress from straightforward to challenging within a stipulated time. Prepare by knowing well-known literary works, their characters, defining traits and significant plot events.",
          'Judging — Round 1: Correct identification of literary characters 10; accuracy and speed of responses 5.',
          'Round 2 — The Time Keeper, “Return or Remain?” (35 marks): Each participant plays a randomly assigned literary character pulled out of their story into the present, with a scenario describing the consequences of their absence. They must convince the Time Keeper (the judge) whether to return to their original timeline or remain.',
          'No prior preparation: Characters and scenarios are assigned on the day, followed by a brief preparation period just before the performance.',
          'Round flow:\n- Character assignment: a random literary character and background scenario.\n- Initial plea (4 minutes): argue to return or remain.\n- Surprise crisis: an unexpected development is introduced mid-round.\n- Final plea (2 minutes): respond to the crisis and defend or revise the decision.\n- Verdict: the Time Keeper announces “Return” or “Remain” — based on argument quality; it does not independently decide the score.',
          'Judging — Round 2: Faithfulness to character 10; persuasiveness & argumentation 10; improvisation & adaptability 10; performance & delivery 5.',
        ],
      },
    ],
  },

  uranus: {
    name: 'Management',
    short: 'SBM',
    faculty: null,
    tagline: 'Pitch it, meme it, escape it, capture it.',
    intro: 'The world tilted toward the future. Four events, from an overnight startup challenge to an outdoor game of capture the assets.',
    events: [
      {
        name: 'Brain to Brand (Pitching Event)',
        format: 'Team of 2–4',
        summary: 'Build a product overnight, face the investors and win the industry rivalry.',
        rules: [
          'Participation: Team event.',
          "Format: Four rounds, each scored out of 25 marks — Round 1: The Overnight Innovation Challenge; Round 2: Industry IQ; Round 3: The Investor's Room; Round 4: Industry Rivalry, The Final Showdown.",
          'Round 1 — The Overnight Innovation Challenge (25 marks): The night before the main event, each team is assigned an industry (such as real estate, healthcare, agriculture, education, transportation or energy). Teams identify a serious problem in that industry and develop a new product or innovative solution, with a basic prototype, within the given time.',
          'Round 1 submissions:\n- A product prototype or working model.\n- A short video demonstrating the product and how it works.\n- A presentation on the problem, proposed solution and target customers.\n- An investor presentation covering the business model and market opportunity.\n- A marketing and launch strategy.\n- A financial plan: startup costs, production expenses, pricing, revenue and expected profitability.\n- A share-distribution plan: founder ownership, equity offered and investment required.\n- A production, transportation and distribution plan.\n- A competitive strategy explaining how the product stands out.',
          'Round 1 evaluation: Innovation, societal impact, practicality and business feasibility; the strongest teams qualify. Rubric (5 each): problem & social impact, creativity & originality, prototype or demo, financial feasibility, marketing & business plan.',
          'Round 2 — Industry IQ (25 marks): A quiz on each team’s assigned industry — major companies, business models, market trends, challenges and key developments — through rapid fire, visual identification, multiple choice and short business scenarios. Rubric (5 each): industry knowledge, company & business awareness, current trends, business case questions, speed & accuracy.',
          "Round 3 — The Investor's Room (25 marks): Teams pitch to judges acting as investors, demonstrating the prototype and explaining the problem, customers, launch strategy, financial projections, production and distribution plans and competitive advantage — plus the investment required, its use and the equity offered. Judges challenge assumptions and plans. Rubric (5 each): idea & uniqueness, market potential, financial plan & investment request, presentation & demo, answers to judges.",
          "Round 4 — Industry Rivalry, The Final Showdown (25 marks): Teams with products in the same industry go head-to-head, defending their product, questioning competitors' strategies and arguing why their solution offers greater value.",
          'Round 4 surprise challenges: Judges may introduce rising costs, a new competitor, supply-chain disruptions or a sudden change in demand, and teams must respond immediately.',
          "Round 4 evaluation: Innovation, competitive strategy, financial and operational feasibility, quality of arguments and handling of surprises. Rubric (5 each): advantage over competitors, industry & competitor knowledge, arguments & rebuttals, response to surprise challenges, confidence & communication.",
        ],
      },
      {
        name: 'Meme Battle',
        format: 'Team of 3',
        summary: 'From online prelims to a live meme face-off — humour under pressure.',
        rules: [
          'Team size: Each team must have exactly three members.',
          'Format: Four rounds — online meme creation, a live reference challenge, timed meme-making and a final performance face-off.',
          "Round 1 — Online prelims, “Meme It Up!”: Submit three original memes on business, economics or announced themes before the deadline. Copied or AI-generated memes are not allowed. The top 15 teams qualify.",
          'Round 2 — Meme Sound & Reference Rush: A live guessing challenge with meme sounds, images, short clips and cropped visuals. Identify the sound, person or source, or explain or recreate the meme. The first correct answer earns points; any penalties are announced beforehand. The top 10 teams qualify (tie-break question for the last place).',
          'Round 3 — Meme Factory, “Create Under Pressure!”: 45 minutes to create three memes from prompts revealed at the venue — a Relatable meme (college life), a Business meme and a Wildcard. Own phones, laptops and photos allowed; no AI-generated content. The top 6 teams qualify. Rubric (5 each): humour, originality, relevance, caption quality, overall impact.',
          'Round 4 — Meme Face-Off, “The Ultimate Battle!”: Six finalists in three head-to-head pairs. Each pair gets the same prompt, template, sound or situation, with 60 seconds to prepare and up to 60 seconds to perform. Twists may include Switch the Context, Dialogue Dub, Expression Challenge or Plot Twist. The three winners play a final mini-battle for the title. Rubric (5 each): humour & audience reaction, spontaneity, creativity, acting & stage presence, relevance.',
          'Qualification flow: All entries → top 15 → top 10 → top 6 → 3 face-off winners → 1 overall winner.',
          'Originality: All submissions and performances must be original. Plagiarism and AI-generated meme content are not allowed in any round.',
          'Content rules: Vulgar, sexually explicit, hateful, discriminatory or personally insulting content leads to disqualification. Do not target identifiable individuals, faculty, students, institutions or other teams. No political or religious content.',
          'General: Teams must follow all time limits and organiser instructions. Late submissions may be rejected.',
        ],
      },
      {
        name: 'Escape Room',
        format: 'Team of 2',
        summary: 'The CEO has vanished before the big deal. You have 20 minutes.',
        rules: [
          'Team size: Each team consists of 2 members.',
          'Overview: A management-themed puzzle challenge — solve clues, crack codes and complete a mission in limited time, testing logic, observation, communication and teamwork.',
          "Theme — The Missing CEO: A company's CEO disappears just before an important deal. Uncover what happened by solving clues tied to different departments; the final clues lead to a code that unlocks the exit.",
          'Puzzle stages: The Locked Briefcase (a business riddle), The Finance File (spot the wrong figure), The Marketing Mystery (decode a brand clue), The HR Investigation (find the person connected to the mystery) and The Final Unlock (combine every clue for the final code).',
          'Time: A maximum of 20 minutes per team.',
          "Hints: A maximum of 2 hints per team. Each hint adds a 2-minute penalty to the team's final time.",
          'Rules: Mobile phones are not allowed. Do not force locks, damage props or move objects not marked as clues.',
          'Ranking: Teams that escape are ranked by adjusted completion time (time taken + penalties). If no team escapes, the team that solves the most puzzles in the least adjusted time ranks highest.',
          'Twist — The Double Agent: Two conflicting pieces of information may appear; use evidence from earlier stages to decide which clue is false.',
          'Prizes: Recognition for the top 3 teams.',
        ],
      },
      {
        name: 'Capture the Assets',
        format: 'Team of 6 (+2 subs)',
        summary: 'Capture the Flag with a business twist — every asset has a hidden value.',
        rules: [
          'Description: An outdoor field game inspired by Capture the Flag. Collect mystery assets from a central neutral zone and bring them safely back to base without being tagged. Each asset has a hidden point value revealed only at the end — the most assets does not guarantee victory.',
          'Team size: 6 playing members and 2 substitutes. Teams should be mixed, as specified by the organisers.',
          'Format: Knockout. Each match has two halves of 8 minutes with a 2-minute interval.',
          'Field layout: Team A Base, the Neutral Zone (the main playing area) and Team B Base. Bases are safe areas where each team starts and returns its assets.',
          'Objective: Collect assets from the neutral zone and bring them back to your base before the match ends. Players may carry only one asset at a time.',
          'Sprint Circle: All assets sit inside a marked circle at the centre of the neutral zone. Players cannot be tagged inside it, may collect one asset per trip, must leave promptly, and must not push or obstruct opponents inside it.',
          'Tagging: Only in the neutral zone outside the Sprint Circle — a gentle touch on the shoulder or upper arm. Pushing, grabbing, tackling, tripping, holding or forceful blocking is strictly prohibited. Players in their own base cannot be tagged. Referees decide disputed tags.',
          'Jail: A tagged player goes to the jail area. Any asset they carried is left at the return point in the neutral zone, open to either team.',
          'Rescue: A teammate may free a jailed player by safely reaching and touching them, following the referee’s instructions.',
          "Asset redemption: Instead of a rescue, a team may free a teammate by surrendering one collected asset, which returns to the neutral zone and leaves the team's score.",
          'Scoring: Each asset has a hidden value (for example 100, 300, 500 or 1,000 points). Only assets held at your base when the match ends count.',
          'Winner: At the final whistle, organisers verify the assets at each base, reveal their values and total the scores. The highest total asset value wins.',
        ],
      },
    ],
  },

  neptune: {
    name: 'DPS',
    short: 'DPS',
    faculty: 'Dr. Deon Bablu Thomas',
    tagline: 'Persuade, debate, survive.',
    intro: 'The far edge of the system, where only the persuasive survive. Talk your way onto the last parachute, then lead your department in the Clash of Councils.',
    events: [
      {
        name: 'Air Crash',
        format: 'Individual',
        summary: 'The plane is going down and there is one parachute left. Make your case.',
        rules: [
          'Participation: Individual.',
          'Scenario: The plane is going down and only one parachute remains after the pilot takes theirs.',
          'Role assignment: Each participant is assigned or chooses a famous personality — historical, fictional, celebrity, political figure and so on.',
          "Round 1 — Character Pitch: A persuasive speech on why your character's survival is vital to society.",
          'Round 2 — Cross-Questioning: Judges and opposing participants ask challenging questions to test character knowledge, wit and presence of mind.',
          'Judging: Oratory & persuasion, character portrayal, humour & wit, confidence, body language and response quality.',
          'Scoring: Oratory & persuasion 40; character portrayal 30; humour & wit 20; presence of mind 10.',
          "General: Participants must stay in character during the presentation and questioning. The judges' decision is final.",
        ],
      },
      {
        name: 'Clash of Councils',
        format: 'Team of 5–8',
        summary: 'Departments go head-to-head across team events for the overall championship.',
        rules: [
          'Eligibility: Open to students from departments or campus factions approved by the organisers. Team size: 5–8. Each department nominates a team captain.',
          'Registration: Register before the deadline, carry a valid university ID and meet the event-specific eligibility and team-size criteria. Changes to registered participants need prior approval.',
          'Format: Multiple team events under the Clash of Councils programme. Schedules, venues, participant limits and event-specific rules are announced in advance.',
          'Points: Awarded by final position in each event — First 10, Second 7, Third 5, Fourth 3, Fifth 2, Sixth 1. Bonus or spirit points are announced in advance.',
          'Champion: The department with the highest cumulative score is the overall champion.',
          'Attendance: Report at least 15 minutes before your scheduled event. Late arrivals, absences or withdrawals may mean forfeiture or disqualification.',
          'Code of conduct: Maintain discipline, sportsmanship and respect. Cheating, harassment, discrimination, abusive language and deliberate disruption are prohibited and may bring warnings, point deductions, forfeiture or disqualification.',
          "Judging: Criteria are announced before each event. Judges' decisions are final, subject to review for scoring errors or procedural irregularities. Complaints go promptly from the team captain to the event coordinator.",
          'Tie-breaking: Overall ties are resolved by comparing first-, second- and third-place finishes, then a tie-breaker if needed.',
          'Safety: Follow safety instructions, use university property responsibly and report injuries or unsafe conditions immediately. The organising committee may modify or suspend events for safety or regulatory reasons, and resolves matters not covered here under university regulations.',
        ],
      },
    ],
  },
};

/** Tour order for the pages: the sun (CUBYC), then outward by orbit — the station sits between Mars and Jupiter. */
export const ORDER = ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'station', 'jupiter', 'saturn', 'uranus', 'neptune'];

/** Departments only (every page except the CUBYC hub). */
export const DEPT_ORDER = ORDER.filter((k) => !DEPARTMENTS[k].hub);

export const EVENT_COUNT = ORDER.reduce((n, k) => n + DEPARTMENTS[k].events.length, 0);

/** URL-safe id for an event (used in #/dept/<key>/<event>). */
export const eventSlug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
