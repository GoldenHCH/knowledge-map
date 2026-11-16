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
        question:
          'You know a derivative is a rate of change. If y changes 3 times as fast as u, and u changes 2 times as fast as x, how fast does y change when x changes?',
        buildsOnTitle: 'Derivatives',
        hint: 'Imagine x moves by 1. How far does u move, and then how far does y move because of that?',
        reasoning:
          'If x moves by 1, u moves by 2. Each unit of u moves y by 3, so y moves by 2 x 3 = 6. The two rates of change multiply, so y changes 6 times as fast as x.',
      },
      {
        question:
          'Let u = 2x + 1 and y = u squared. You can graph both as functions. At x = 1, what is the slope of u with respect to x, what is the slope of y with respect to u, and what do you get when you combine them?',
        buildsOnTitle: 'Functions & graphs',
        hint: 'First find the value of u at x = 1, then find the slope of y = u squared at that u. The slope of u = 2x + 1 never changes.',
        reasoning:
          'At x = 1, u = 3. The slope of u with respect to x is 2. The slope of y = u squared is 2u, which is 6 at u = 3. Multiplying gives 2 x 6 = 12, so y changes 12 times as fast as x at that point.',
      },
      {
        question:
          'Now check it directly. Substitute u to write y = (2x + 1) squared, expand it, and take the derivative. Does it give 12 at x = 1, and what does that tell you about multiplying the two slopes?',
        buildsOnTitle: 'Derivatives',
        hint: 'Expanding gives 4x squared + 4x + 1. Differentiate term by term, then put in x = 1.',
        reasoning:
          'y = 4x squared + 4x + 1, so dy/dx = 8x + 4, which is 12 at x = 1. That matches the product of the two slopes, so for a function inside a function you multiply the derivative of the outer part by the derivative of the inner part.',
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
        question:
          'Take the loss L(w) = (w - 3) squared, which measures how wrong a weight w is. At w = 5, what is the derivative, and should you move w up or down to make the loss smaller?',
        buildsOnTitle: 'Derivatives',
        hint: 'Differentiate (w - 3) squared, then look at the sign of the answer at w = 5.',
        reasoning:
          'The derivative is 2(w - 3), which is 4 at w = 5. A positive slope means the loss rises as w rises, so you should move w down. Stepping against the derivative reduces the loss.',
      },
      {
        question:
          'In linear regression your line is y = w x and the loss is the average squared error. Suppose the slope of the loss at your current w is 4 and you take a step of size 0.1 against it. What is the new w if w was 5, and what is the new loss?',
        buildsOnTitle: 'Linear regression',
        hint: 'The new w is the old w minus step size times slope. Then put the new w into (w - 3) squared.',
        reasoning:
          'New w = 5 - 0.1 x 4 = 4.6. The loss goes from (5 - 3) squared = 4 to (4.6 - 3) squared = 2.56. A small step against the slope made the loss smaller, and repeating it keeps lowering the loss.',
      },
      {
        question:
          'A real model has two weights, stored as the vector [w1, w2] = [5, 2]. The slopes of the loss are [4, -6]. With a step size of 0.1, what is the updated vector, and why does the second weight move in the opposite direction?',
        buildsOnTitle: 'Vectors & matrices',
        hint: 'Subtract 0.1 times the slope vector from the weight vector, one entry at a time.',
        reasoning:
          'The update is [5, 2] - 0.1 x [4, -6] = [4.6, 2.6]. The second slope is negative, so the loss falls when w2 rises, and subtracting a negative number moves it up. The vector of slopes points uphill, so subtracting it moves every weight downhill together.',
      },
    ],
    takeaway:
      'Gradient descent repeats one move: compute the slope of the loss for every weight, then subtract a small multiple of that slope vector. Each step lowers the loss until it stops improving.',
  },
};
