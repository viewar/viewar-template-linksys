const webpack = require('webpack');
const UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;
const LoaderOptionsPlugin = webpack.LoaderOptionsPlugin;
const DefinePlugin = webpack.DefinePlugin;
const path = require('path');

const root = path.resolve(__dirname, '..');

module.exports = {
  context: root,

  entry: path.resolve(root, 'src/index.js'),

  output: {
    path: path.resolve(root, 'dist'),
    filename: 'viewar-api.js',
    library: 'viewarApi',
    libraryTarget: 'umd',
    sourceMapFilename: "[file].map",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: path.resolve(root, 'src'),
        loader: 'babel-loader',
        options: {
          babelrc: false,
          sourceRoot: root,
          presets: ['es2015', 'stage-0', 'bluebird'],
        },
      },
      {
        test: /\.ne/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              sourceRoot: root,
              presets: ['es2015', 'stage-0', 'bluebird'],
            },
          },
          'nearley-loader',
        ]
      },
    ],
  },
  resolve: {
    modules: [
      path.resolve(root, 'node_modules'),
    ],
    extensions: ['.js', '.json'],
  },
  plugins: [
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    new LoaderOptionsPlugin({
      minimize: true,
    }),
    new UglifyJsPlugin({
      sourceMap: true,
      compress: {
        warnings: false,
      },
      mangle: true,
      output: {
        comments: false,
      },
    })
  ],
};
