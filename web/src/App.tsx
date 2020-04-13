import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import {
  Charts,
  ChartContainer,
  ChartRow,
  YAxis,
  LineChart,
  Resizable,
} from 'react-timeseries-charts';
import { TimeSeries, TimeRange } from 'pondjs';

function getTime(milli: number): { s: string; m: string; ms: string } {
  milli = Math.floor(milli / 100) * 100;
  const m = Math.floor(milli / 60000);
  const s = Math.floor((milli - m * 60000) / 1000);
  const ms = milli - s * 1000 - m * 60000;
  return {
    m: m < 10 ? `0${m}` : `${m}`,
    s: s < 10 ? `0${s}` : `${s}`,
    ms: `${ms / 100}`,
  };
}

function useInterval(callback: Function, delay: number) {
  const savedCallback = useRef<Function>();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

let socket = null;

const App = () => {
  const [ms, setMs] = useState(0);
  const [readings, setReadings] = useState<{
    [key: string]: { weight: number; flowRate: number };
  }>({
    '0': { weight: 0, flowRate: 0 },
  });
  const [timerState, setTimerState] = useState<'off' | 'on' | 'pause'>('off');
  const [delay, setDelay] = useState<null | number>(null);
  const [weight, setWeight] = useState<number>(0);

  const displayTime = getTime(ms);
  const tare = async () => {
    socket.send('1');
  };

  const past1Sec =
    delay === null
      ? []
      : Object.keys(readings)
          .sort((a, b) => parseInt(b, 10) - parseInt(a, 10))
          .slice(0, 5)
          .map((t) => readings[t].weight);

  const flowRate =
    delay === null
      ? 0
      : ((past1Sec[0] - past1Sec[past1Sec.length - 1]) * 5) / past1Sec.length;

  useEffect(() => {
    if (socket === null) {
      socket = new WebSocket('ws://localhost:8001');
      socket.addEventListener('message', (e) => {
        const w = parseFloat(e.data);
        if (ms % 100 === 0) {
          setWeight(w);
        }
      });
      return () => socket.close();
    }
  }, []);

  useInterval(() => {
    setMs(ms + delay);
    if ((ms + delay) % 200 == 0) {
      setReadings({
        ...readings,
        [ms + delay]: { weight, flowRate },
      });
    }
  }, delay);

  const points = Object.keys(readings).map((key) => [
    parseInt(key, 10),
    readings[key].weight,
    readings[key].flowRate,
  ]);

  const series = new TimeSeries({
    name: 'weight',
    columns: ['time', 'weight', 'flowRate'],
    points,
  });

  return (
    <div className="wrapper">
      <div className="left">
        <Resizable>
          <ChartContainer
            utc={true}
            format="relative"
            timeRange={new TimeRange([new Date(0), new Date(180000)])}
            showGrid={true}
          >
            <ChartRow height="650" showGrid={true}>
              <YAxis
                style={{ label: { fontSize: 42 } }}
                showGrid={true}
                id="weight"
                label="weight"
                min={0}
                max={500}
                tickCount={21}
                width="60"
                type="linear"
                format=",.0f"
              />
              <Charts>
                <LineChart
                  columns={['weight']}
                  axis="weight"
                  interpolation="curveNatural"
                  series={series}
                  style={{
                    weight: {
                      normal: {
                        stroke: '#bd1722',
                        fill: 'none',
                        strokeWidth: 3,
                      },
                    },
                  }}
                />
                <LineChart
                  columns={['flowRate']}
                  axis="flowRate"
                  interpolation="curveNatural"
                  series={series}
                  style={{
                    flowRate: {
                      normal: {
                        stroke: '#139b92',
                        fill: 'none',
                        strokeWidth: 3,
                      },
                    },
                  }}
                />
              </Charts>
              <YAxis
                showGrid={true}
                id="flowRate"
                label="flow rate"
                min={0}
                max={100}
                width="60"
                type="linear"
                format=",.0f"
              />
            </ChartRow>
          </ChartContainer>
        </Resizable>
      </div>

      <div className="right">
        <div className="display row timer">
          {displayTime.m}:{displayTime.s}:{displayTime.ms}
        </div>
        <div className="row">time</div>

        <div className="display row">
          <br />
          {!weight ? '0.0' : (Math.round(weight * 10) / 10).toFixed(1)}
          {` g__`}
        </div>
        <div className="row">weight</div>

        <div className="display row">
          <br />
          {flowRate.toFixed(1)} g/s
        </div>
        <div className="row">flow rate</div>

        <div className="controls row">
          {timerState === 'off' && (
            <button
              className="timer-btn"
              onClick={() => {
                setTimerState('on');
                setDelay(100);
              }}
            >
              start
            </button>
          )}
          {timerState === 'on' && (
            <button
              className="timer-btn"
              onClick={() => {
                setTimerState('pause');
                setDelay(null);
              }}
            >
              stop
            </button>
          )}
          {timerState === 'pause' && (
            <button
              className="timer-btn"
              onClick={() => {
                setTimerState('off');
                setMs(0);
                setReadings({ '0': { weight: 0, flowRate: 0 } });
              }}
            >
              reset
            </button>
          )}
          <button className="tare-btn" onClick={tare}>
            tare
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
