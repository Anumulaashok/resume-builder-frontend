module.exports = {
  // ...existing code...
  devServer: {
    hot: true,
    watchFiles: ['src/**/*'],
    client: {
      overlay: true,
    }
  },
  // ...existing code...
}