#!/bin/bash
# bundle-calc-engine.sh
# Bundles the PokeMMO damage calc into a single browser-ready JS file.
# Run this on the server after building the calc.

set -e

CALC_DIR="/var/lib/mmoshowdown-damage-calc"
CLIENT_JS="/var/lib/pokemon-showdown-client/play.pokemonshowdown.com/js"
OUTPUT="$CLIENT_JS/pokemmo-calc-engine.js"

echo "Building PokeMMO calc..."
cd "$CALC_DIR"
node build

echo "Bundling for browser..."

# Create a webpack config for browser bundling
cat > /tmp/webpack-calc.config.js << 'WEOF'
const path = require('path');
module.exports = {
  mode: 'production',
  entry: path.resolve('/var/lib/mmoshowdown-damage-calc/dist/index.js'),
  output: {
    path: path.resolve('/var/lib/pokemon-showdown-client/play.pokemonshowdown.com/js'),
    filename: 'pokemmo-calc-engine.js',
    library: 'PokeMMOCalc',
    libraryTarget: 'window',
  },
  resolve: {
    fallback: {
      fs: false,
      path: false,
    },
  },
};
WEOF

# Install webpack if not present
if ! command -v npx &> /dev/null; then
  npm i -g npx
fi

cd /tmp
npx webpack --config webpack-calc.config.js

echo "Bundled calc engine -> $OUTPUT"
echo "Exposed as window.PokeMMOCalc"

# Set permissions
chown showdown:showdown "$OUTPUT"
chmod 644 "$OUTPUT"

echo "Done."
