import { ISampleTranscript } from './knowledge-map.interfaces';

export const sampleTranscripts: ISampleTranscript[] = [
  {
    id: 'cs-student',
    label: 'Second-year computer science student',
    text: [
      'Northfield University - Unofficial transcript',
      'B.Sc. Computer Science, year 2',
      'Fall 2023  MATH 101  Calculus I  A-',
      'Fall 2023  CS 101  Intro to Programming in Python  A',
      'Winter 2024  MATH 102  Calculus II  C+',
      'Winter 2024  MATH 110  Linear Algebra  B+',
      'Winter 2024  STAT 120  Intro Statistics  B-',
      'Fall 2024  CS 201  Data Structures  B',
      'Fall 2024  CS 210  Discrete Mathematics  B',
      'Winter 2025  CS 220  Computer Organization  B+',
      'Winter 2025  CS 230  Intro to Databases  A-',
      'Cumulative GPA 3.3',
    ].join('\n'),
  },
  {
    id: 'self-taught-web',
    label: 'Self-taught web developer',
    text: [
      'Alex Rivera - Web developer (self-taught)',
      'Summary: Two years of building websites on my own and for local clubs.',
      '- Built a portfolio site and three small business sites with HTML, CSS and vanilla JavaScript.',
      '- Wrote responsive layouts with flexbox and CSS grid; no CSS frameworks.',
      '- Built a REST API in Node and Express with a JSON file store for a campus events app.',
      '- Deployed to a cheap VPS; comfortable with git and the command line.',
      '- Completed an online JavaScript course in 2022 and refreshed DOM manipulation last year.',
      '- Read about promises and async/await but mostly use callbacks.',
      '- Have not used React, TypeScript or any SQL database yet.',
      'Interests: accessibility, open source, learning React next.',
    ].join('\n'),
  },
  {
    id: 'marketing-analyst',
    label: 'Marketing analyst',
    text: [
      'Jordan Lee - Marketing analyst, five years experience',
      'BBA Marketing, Lakeside College, 2018',
      '- Business Statistics (B+): descriptive statistics, confidence intervals, simple regression.',
      '- Advanced Excel: pivot tables, lookup formulas and dashboards used weekly in my role.',
      '- Ran email campaigns for a retail brand and reported open and click rates each month.',
      '- Designed and analysed A/B tests on subject lines and landing pages with a vendor tool.',
      '- Built monthly reports in a BI dashboard tool; basic SQL queries to pull data.',
      '- Took no formal probability, calculus or programming courses.',
      '- Currently exploring Python for analysis through short online tutorials.',
      'Skills: Excel, campaign analytics, reporting, stakeholder presentations.',
    ].join('\n'),
  },
];
