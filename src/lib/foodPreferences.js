export const splitFoodPreferenceItems = value => {
  const items = [];
  let current = "";
  let parenthesesDepth = 0;

  for (const character of String(value || "")) {
    if (character === "(") parenthesesDepth += 1;
    if (character === ")" && parenthesesDepth > 0) parenthesesDepth -= 1;

    if (character === "," && parenthesesDepth === 0) {
      if (current.trim()) items.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  if (current.trim()) items.push(current.trim());
  return items;
};
