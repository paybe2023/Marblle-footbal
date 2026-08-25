export const GOAL_GEOMETRY=Object.freeze({lineX:1660,top:594,bottom:922});

export function legalGoalCrossing(previous,current,radius,goal=GOAL_GEOMETRY){
  if(!previous||!current||current.x<=previous.x)return false;const threshold=goal.lineX+radius;if(previous.x>=threshold||current.x<threshold)return false;const progress=(threshold-previous.x)/(current.x-previous.x),crossingY=previous.y+(current.y-previous.y)*progress;return crossingY>=goal.top+radius&&crossingY<=goal.bottom-radius;
}
