'use strict';

const React = require('react');

class GraphRow extends React.Component {

  constructor() {
    super();
    this.state = {
      isLoaded: false
    };
  }

  tween() {
    const toggle = (val) => TweenMax.to(this.refs.graphContainer, 0.2, { opacity: val });
    if (this.props.isRowActive) {
      toggle(1);
    } else {
      toggle(0);
    }
  }

  componentDidMount() {
    this.refs.graphContainer.style.opacity = 0;
  }

  componentDidUpdate() {
    let task = Promise.resolve();
    if (this.props.isRowActive && !this.state.isLoaded) {
      task = this.drawCharts();
    }
    task.then(() => this.tween());
  }

  drawCharts() {
    const drawChart = (el, track) => {
      const chart = new google.visualization.Timeline(el);
      const dataTable = new google.visualization.DataTable();

      dataTable.addColumn({ type: 'string', id: 'Item' });
      dataTable.addColumn({ type: 'string', id: 'dummy bar label' });
      dataTable.addColumn({ type: 'string', role: 'tooltip' });
      dataTable.addColumn({ type: 'number', id: 'Start' });
      dataTable.addColumn({ type: 'number', id: 'End' });

      const tooltip = (z) => JSON.stringify({
        start: z.timeElaspsed.start,
        end: z.timeElaspsed.end,
        elapsed: z.timeElaspsed.elapsed,
        value: z.response || z.error
      });

      dataTable.addRows(
        track.map(z => [z.message, null, tooltip(z), z.timeElaspsed.start, z.timeElaspsed.end])
      );

      const graphHeight = track.length > 5 ? `${5 * 50}` : `${track.length * 50}`;
      chart.draw(dataTable, { tooltip: { isHtml: true }, height: graphHeight });

      this.setState({
        isLoaded: true
      });
    };

    google.charts.load('current', { packages: ['timeline'] });
    return new Promise((resolve) => {
      google.charts.setOnLoadCallback(() => {
        drawChart(this.refs.graph, this.props.track);
        resolve();
      });
    });
  }

  render() {
    return (
      <div ref='graphContainer' className='row'>
        <div ref='graph' className='col-md-12'></div>
      </div>
    );
  }
}

module.exports = GraphRow;
