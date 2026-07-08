// expo-audio's config plugin adds UIBackgroundModes: ["audio"], but this app
// only plays short foreground sounds. Apple rejects unused background modes
// (Guideline 2.5.4), so strip it from the generated Info.plist.
const { withInfoPlist } = require('expo/config-plugins');

module.exports = function withoutBackgroundAudio(config) {
  return withInfoPlist(config, (c) => {
    const modes = c.modResults.UIBackgroundModes;
    if (Array.isArray(modes)) {
      const filtered = modes.filter((m) => m !== 'audio');
      if (filtered.length > 0) c.modResults.UIBackgroundModes = filtered;
      else delete c.modResults.UIBackgroundModes;
    }
    return c;
  });
};
