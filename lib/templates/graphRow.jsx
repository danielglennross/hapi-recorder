'use strict';

const React = require('react');

class GraphRow extends React.Component {

  constructor() {
    super();
    this.state = {
      isLoaded: false,
      maxGraphHeight: this.getGraphHeight(5)
    };
  }

  getGraphHeight(trackLength) {
    return trackLength * 66;
  }

  tween() {
    const toggle = (val) => TweenMax.to(this.refs.graph, 0.2, { height: val });
    if (this.props.isRowActive) {
      toggle(this.state.maxGraphHeight);
    } else {
      toggle(0);
    }
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

      if (track.length <= 5) {
        this.setState({
          maxGraphHeight: this.getGraphHeight(track.length)
        });
      }
      chart.draw(dataTable, { tooltip: { isHtml: true }, height: this.state.maxGraphHeight });

      this.setState({
        isLoaded: true
      });

      this.refs.graph.style.height = 0;
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
      <div ref='graph' className='col-md-12 graph'></div>
    );
  }
}

module.exports = GraphRow;
