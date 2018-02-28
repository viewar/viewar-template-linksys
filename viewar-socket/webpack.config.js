module.exports = {
  entry: __dirname + '/src/index.js',
  //target: 'node',
  output: {
    path: __dirname + '/dist',
    filename: 'build.js',
    libraryTarget: 'umd'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel-loader',
      exclude: /node_modules/
    }]
  }
}