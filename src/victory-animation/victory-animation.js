import React from "react";
import * as d3Ease from "d3-ease";
import { timer } from "d3-timer";
import { victoryInterpolator } from "./util";

export default class VictoryAnimation extends React.Component {
  static displayName = "VictoryAnimation";

  static propTypes = {
    children: React.PropTypes.func,
    duration: React.PropTypes.number,
    easing: React.PropTypes.oneOf([
      "back", "backIn", "backOut", "backInOut",
      "bounce", "bounceIn", "bounceOut", "bounceInOut",
      "circle", "circleIn", "circleOut", "circleInOut",
      "linear", "linearIn", "linearOut", "linearInOut",
      "cubic", "cubicIn", "cubicOut", "cubicInOut",
      "elastic", "elasticIn", "elasticOut", "elasticInOut",
      "exp", "expIn", "expOut", "expInOut",
      "poly", "polyIn", "polyOut", "polyInOut",
      "quad", "quadIn", "quadOut", "quadInOut",
      "sin", "sinIn", "sinOut", "sinInOut"
    ]),
    delay: React.PropTypes.number,
    onEnd: React.PropTypes.func,
    data: React.PropTypes.oneOfType([
      React.PropTypes.object,
      React.PropTypes.array
    ])
  };

  static defaultProps = {
    duration: 1000,
    easing: "quadInOut",
    delay: 0,
    data: {}
  };

  constructor(props) {
    super(props);
    /* defaults */
    this.state = {
      data: Array.isArray(this.props.data) ?
        this.props.data[0] : this.props.data,
      animationInfo: {
        progress: 0,
        animating: false
      }
    };
    this.interpolator = null;
    this.queue = Array.isArray(this.props.data) ?
      this.props.data.slice(1) : [];
    /* build easing function */
    this.ease = d3Ease[this.toNewName(this.props.easing)];
    /*
      unlike React.createClass({}), there is no autobinding of this in ES6 classes
      so we bind functionToBeRunEachFrame to current instance of victory animation class
    */
    this.functionToBeRunEachFrame = this.functionToBeRunEachFrame.bind(this);
  }

  componentDidMount() {
    // Length check prevents us from triggering `onEnd` in `traverseQueue`.
    if (this.queue.length) {
      this.traverseQueue();
    }
  }

  /* lifecycle */
  componentWillReceiveProps(nextProps) {
    /* cancel existing loop if it exists */
    if (this.timer) {
      this.timer.stop();
    }
    /* If an object was supplied */
    if (!Array.isArray(nextProps.data)) {
      // Replace the tween queue. Could set `this.queue = [nextProps.data]`,
      // but let's reuse the same array.
      this.queue.length = 0;
      this.queue.push(nextProps.data);
    /* If an array was supplied */
    } else {
      /* Extend the tween queue */
      this.queue.push(...nextProps.data);
    }
    /* Start traversing the tween queue */
    this.traverseQueue();
  }

  componentWillUnmount() {
    if (this.timer) {
      this.timer.stop();
    }
  }

  toNewName(ease) {
    // d3-ease changed the naming scheme for ease from "linear" -> "easeLinear" etc.
    const capitalize = (s) => s && s[0].toUpperCase() + s.slice(1);
    return `ease${capitalize(ease)}`;
  }

  /* Traverse the tween queue */
  traverseQueue() {
    if (this.queue.length) {
      /* Get the next index */
      const data = this.queue[0];
      /* compare cached version to next props */
      this.interpolator = victoryInterpolator(this.state.data, data);
      /* reset step to zero */
      this.timer = timer(this.functionToBeRunEachFrame, this.props.delay);
    } else if (this.props.onEnd) {
      this.props.onEnd();
    }
  }
  /* every frame we... */
  functionToBeRunEachFrame(elapsed) {
    /*
      step can generate imprecise values, sometimes greater than 1
      if this happens set the state to 1 and return, cancelling the timer
    */
    const step = elapsed / this.props.duration;

    if (step >= 1) {
      this.setState({
        data: this.interpolator(1),
        animationInfo: {
          progress: 1,
          animating: false
        }
      });
      this.timer.stop();
      this.queue.shift();
      this.traverseQueue(); // Will take care of calling `onEnd`.
      return;
    }
    /*
      if we're not at the end of the timer, set the state by passing
      current step value that's transformed by the ease function to the
      interpolator, which is cached for performance whenever props are received
    */
    this.setState({
      data: this.interpolator(this.ease(step)),
      animationInfo: {
        progress: step,
        animating: step < 1
      }
    });
  }
  render() {
    return this.props.children(this.state.data, this.state.animationInfo);
  }
}
