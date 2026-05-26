const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

const appConfig = {
  entry: {
    teacher: './src/index.ts',
    student: './src/student/index.tsx',
    cms: './src/cms/index.tsx'
  },
  output: {
    // Output to plugin-root build/ instead of amd/build/ so Moodle's AMD scanner
    // never registers these bundles as RequireJS modules and double-executes them.
    // (Same reason shepherd-tour.min.js lives in js/ — see shepherd config below.)
    path: path.resolve(__dirname, '../build'),
    filename: '[name].min.js',
    library: {
      name: 'ArinaPrismSense',
      type: 'window'
    },
    publicPath: '/local/arina_prism_sense/build/'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    fullySpecified: false,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: { loader: 'ts-loader', options: { transpileOnly: true } },
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      }
    ]
  },
  // Exclude large libraries that are bundled separately to reduce webpack memory usage
  externals: {
    'react': 'React',
    'react-dom': 'ReactDOM',
  },
  // Extract shared vendor code (MUI, Emotion, etc.) into a single chunk
  // Disable default cache groups to prevent Webpack from generating random numbered chunks 
  // (which break in Moodle due to dynamic publicPath issues across different installations).
  optimization: {
    minimizer: [
      new TerserPlugin({ parallel: 2 }),
    ],
    splitChunks: {
      cacheGroups: {
        default: false,
        defaultVendors: false,
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'all',
          enforce: true
        },
      },
    },
  },
};

// Standalone Shepherd.js bundle — served from js/ so it is not processed by Moodle's AMD scanner
const shepherdConfig = {
  entry: './src/shepherd-bundle.ts',
  output: {
    path: path.resolve(__dirname, '../js'),
    filename: 'shepherd-tour.min.js',
    library: {
      name: 'ShepherdBundle',
      type: 'window',
    },
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    fullySpecified: false,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: { loader: 'ts-loader', options: { transpileOnly: true } },
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.m?js$/,
        resolve: { fullySpecified: false },
      }
    ]
  },
};

module.exports = [appConfig, shepherdConfig];