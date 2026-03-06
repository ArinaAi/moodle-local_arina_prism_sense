const path = require('path');

module.exports = {
  entry: {
    teacher: './src/index.ts',
    student: './src/student/index.tsx',
    cms: './src/cms/index.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].min.js',
    library: {
      name: 'LectureBot',
      type: 'window'
    },
    publicPath: '/local/lecturebot/amd/build/'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    fullySpecified: false,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
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
  // REMOVE externals - we'll bundle React with our app
  // externals: {
  //   'react': 'React',
  //   'react-dom': 'ReactDOM'
  // }
};