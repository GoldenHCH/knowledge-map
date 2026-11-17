import { GraphHelper } from './graph.helper';
import { ILesson } from './knowledge-map.interfaces';

export const seededLessons: Record<string, ILesson> = {
  [GraphHelper.conceptKey('Chain rule')]: {
    conceptTitle: 'Chain rule',
    isGenerated: false,
    opening:
      'You already know a derivative is a rate of change, and you can read a function off its graph. The chain rule is what happens when one rate of change feeds into another.',
    questions: [
      {
        kind: 'choice',
        prompt:
          'If y changes 3 times as fast as u, and u changes 2 times as fast as x, how fast does y change when x changes?',
        buildsOnTitle: 'Derivatives',
        choices: [
          {
            text: '5 times as fast',
            isCorrect: false,
            feedback: 'Adding the rates would make sense if the two effects happened side by side, but here one feeds into the other.',
          },
          {
            text: '1.5 times as fast',
            isCorrect: false,
            feedback: 'Dividing the rates compares them to each other, but it does not follow a change from x through u and on to y.',
          },
          {
            text: '6 times as fast',
            isCorrect: true,
            feedback: 'Right: when x moves by 1, u moves by 2, and each unit of u moves y by 3, so the rates multiply.',
          },
          {
            text: '3 times as fast',
            isCorrect: false,
            feedback: 'That only counts how y reacts to u and forgets that u itself is already moving faster than x.',
          },
        ],
        acceptedAnswers: [],
        hint: 'Imagine x moves by 1. How far does u move, and then how far does y move because of that?',
        reasoning:
          'If x moves by 1, u moves by 2. Each unit of u moves y by 3, so y moves by 2 x 3 = 6. The two rates of change multiply, so y changes 6 times as fast as x.',
      },
      {
        kind: 'blank',
        prompt: 'For y = (2x + 1)^2, let u = 2x + 1. Then dy/du = 2u and du/dx = ___.',
        buildsOnTitle: 'Functions & graphs',
        choices: [],
        acceptedAnswers: ['2', 'two'],
        hint: 'u = 2x + 1 is a straight line. What is the slope of a straight line like that?',
        reasoning:
          'The graph of u = 2x + 1 is a line with slope 2, so u changes 2 units for every 1 unit of x. That slope never changes, so du/dx = 2 everywhere.',
      },
      {
        kind: 'choice',
        prompt: 'Using both slopes, which expression is dy/dx for y = (2x + 1)^2?',
        buildsOnTitle: 'Derivatives',
        choices: [
          {
            text: '2(2x + 1)',
            isCorrect: false,
            feedback: 'This is only the slope of the outer square, dy/du, and it leaves out how fast the inside 2x + 1 changes.',
          },
          {
            text: '2x + 1',
            isCorrect: false,
            feedback: 'This just copies the inside function, which is not a rate of change of anything.',
          },
          {
            text: '2(2x + 1) + 2',
            isCorrect: false,
            feedback: 'This adds the inner slope, but the two slopes belong to a chain, so they combine differently.',
          },
          {
            text: '4(2x + 1)',
            isCorrect: true,
            feedback: 'Yes: dy/du = 2(2x + 1) times du/dx = 2 gives 4(2x + 1).',
          },
        ],
        acceptedAnswers: [],
        hint: 'You have dy/du = 2u and du/dx = 2. Combine them the way you did in the first question, then swap u back for 2x + 1.',
        reasoning:
          'The outer slope is dy/du = 2u = 2(2x + 1) and the inner slope is du/dx = 2. Multiplying them gives dy/dx = 4(2x + 1). Expanding y to 4x^2 + 4x + 1 and differentiating gives 8x + 4, which is the same thing.',
      },
    ],
    takeaway:
      'When one quantity depends on another that depends on x, the rate of change of the whole chain is the product of the rates along each link: dy/dx = dy/du x du/dx.',
  },
  [GraphHelper.conceptKey('Gradient descent')]: {
    conceptTitle: 'Gradient descent',
    isGenerated: false,
    opening:
      'You can already fit a line with linear regression, take derivatives and work with vectors. Gradient descent puts those together to find the best line by taking small steps downhill.',
    questions: [
      {
        kind: 'choice',
        prompt:
          'The loss L(w) = (w - 3)^2 measures how wrong a weight w is. At w = 5 the derivative is 4. To make the loss smaller, what should you do to w?',
        buildsOnTitle: 'Derivatives',
        choices: [
          {
            text: 'Increase w, because the slope is positive',
            isCorrect: false,
            feedback: 'A positive slope means the loss goes up as w goes up, so moving that way makes things worse.',
          },
          {
            text: 'Leave w alone, because the derivative is not zero yet',
            isCorrect: false,
            feedback: 'A nonzero derivative means the loss is still changing, which is exactly why there is room to improve.',
          },
          {
            text: 'Decrease w, because the slope is positive',
            isCorrect: true,
            feedback: 'Right: the loss rises as w rises, so stepping against the slope lowers the loss.',
          },
          {
            text: 'Set w to 4, the value of the derivative',
            isCorrect: false,
            feedback: 'The derivative tells you a direction and steepness, not the value that w should take.',
          },
        ],
        acceptedAnswers: [],
        hint: 'A positive derivative means the loss rises when w rises. Which way is downhill?',
        reasoning:
          'The derivative 2(w - 3) is 4 at w = 5. A positive slope means the loss rises as w rises, so you should move w down. Stepping against the derivative reduces the loss.',
      },
      {
        kind: 'blank',
        prompt:
          'In linear regression your weight starts at w = 5 and the slope of the loss is 4. With a step size of 0.1, the new w = 5 - 0.1 x 4 = ___.',
        buildsOnTitle: 'Linear regression',
        choices: [],
        acceptedAnswers: ['4.6', '4.60'],
        hint: 'Work out 0.1 times 4 first, then subtract it from 5.',
        reasoning:
          'The step is 0.1 x 4 = 0.4, so the new w is 5 - 0.4 = 4.6. The loss goes from (5 - 3)^2 = 4 to (4.6 - 3)^2 = 2.56, so one small step against the slope made it smaller.',
      },
      {
        kind: 'choice',
        prompt:
          'A model has two weights [w1, w2] = [5, 2] and the slopes of the loss are [4, -6]. With a step size of 0.1, what is the updated weight vector?',
        buildsOnTitle: 'Vectors & matrices',
        choices: [
          {
            text: '[4.6, 1.4]',
            isCorrect: false,
            feedback: 'Subtracting the step from both weights treats the negative slope like a positive one, so w2 moves the wrong way.',
          },
          {
            text: '[5.4, 2.6]',
            isCorrect: false,
            feedback: 'Adding the step moves w1 uphill on the loss, which is the opposite of what we want.',
          },
          {
            text: '[0.4, 0.6]',
            isCorrect: false,
            feedback: 'This is the step vector itself, but the update changes the weights by that amount instead of replacing them.',
          },
          {
            text: '[4.6, 2.6]',
            isCorrect: true,
            feedback: 'Yes: [5, 2] - 0.1 x [4, -6] = [4.6, 2.6], and subtracting the negative slope moves w2 up.',
          },
        ],
        acceptedAnswers: [],
        hint: 'Subtract 0.1 times the slope vector from the weight vector, one entry at a time. Watch the sign of the second slope.',
        reasoning:
          'The update is [5, 2] - 0.1 x [4, -6] = [4.6, 2.6]. The second slope is negative, so the loss falls when w2 rises, and subtracting a negative number moves it up. The vector of slopes points uphill, so subtracting it moves every weight downhill together.',
      },
    ],
    takeaway:
      'Gradient descent repeats one move: compute the slope of the loss for every weight, then subtract a small multiple of that slope vector. Each step lowers the loss until it stops improving.',
  },
};
