'use strict';

const React = require('react');

class Index extends React.Component {

  render() {
    return (
      <html>
        <head>
          <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
          <script src="http://cdnjs.cloudflare.com/ajax/libs/gsap/1.19.0/TweenMax.min.js"></script>

          <link rel="stylesheet" href="/styles.css" />
          <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" />
        </head>
        <body>
          <div id="app-mount"
              dangerouslySetInnerHTML={{ __html: this.props.children }}>
          </div>
          <script id="app-state"
              dangerouslySetInnerHTML={{ __html: this.props.state }}>
          </script>
          <script src="/assets/client.js"></script>
        </body>
      </html>
    );
  }
}

module.exports = Index;
