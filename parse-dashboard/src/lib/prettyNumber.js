const SUFFIXES = ['', 'k', 'm', 'b'];

export default function prettyNumber(number, places) {
  if (number === undefined) {
    return undefined;
  }

  if ( !places || places < 3) {
    places = 3;
  }

  if ( number.toFixed().length < places) {
    let fullLength = number.toString().length;
    let truncatedLength = number.toFixed().length;

    if ( fullLength > truncatedLength) {
      return number.toFixed(places - truncatedLength);
    }
    return number.toFixed();
  }

  let shortened = number;
  let suffixIndex = 0;
  while(shortened.toFixed().length > places) {
    shortened /= 1000;
    suffixIndex++;
  }

  let remainder = places - shortened.toFixed().length;
  return shortened.toFixed(remainder) + SUFFIXES[suffixIndex];
}