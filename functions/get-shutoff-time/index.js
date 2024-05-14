exports.handler = async (state) => {
  const { minutes } = state;
  const now = new Date();

  // Add the specified number of minutes
  now.setMinutes(now.getMinutes() + minutes);
  const isoString = now.toISOString();
  const formattedDateTime = isoString.slice(0, 19);

  return { shutoffTime: formattedDateTime };
};
