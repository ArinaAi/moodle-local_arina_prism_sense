const path = require('path');

module.exports = {
  entry: {
    teacher: './src/index.ts',
    student: './src/student/index.tsx'
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
    extensions: ['.ts', '.tsx', '.js', '.jsx']
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
      }
    ]
  },
  // REMOVE externals - we'll bundle React with our app
  // externals: {
  //   'react': 'React',
  //   'react-dom': 'ReactDOM'
  // }
};