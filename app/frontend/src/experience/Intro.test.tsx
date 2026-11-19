import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isIntroPlaying } from "../lib/introSignal";
import { Intro } from "./Intro";
import { rememberIntroSeen, resetIntroPolicy, shouldPlayIntro } from "./introPolicy";

// jsdom has no layout or animation clock: animejs is replaced with recording no-ops.
interface FakeTimeline {
  params?: { onComplete?: () => void };
  duration: number;
  progress: number;
  speed: number;
  add: () => FakeTimeline;
  call: () => FakeTimeline;
  pause: () => FakeTimeline;
}
const timelines: FakeTimeline[] = [];
vi.mock("animejs", () => ({
  createScope: () => ({
    add: (setup: () => void) => {
      setup();
      return { revert: () => {} };
    },
  }),
  createTimeline: (params?: FakeTimeline["params"]) => {
    const timeline: FakeTimeline = {
      params,
      duration: 900,
      progress: 0,
      speed: 1,
      add: () => timeline,
      call: () => timeline,
      pause: () => timeline,
    };
    timelines.push(timeline);
    return timeline;
  },
  animate: () => ({}),
  stagger: () => 0,
  utils: { set: () => {} },
}));

beforeEach(() => {
  timelines.length = 0;
  resetIntroPolicy();
});
afterEach(() => resetIntroPolicy());

describe("Intro", () => {
  it("renders nothing with reduced motion and reveals once", () => {
    const onReveal = vi.fn();
    const { container } = render(<Intro reducedMotion onReveal={onReveal} />);
    expect(container).toBeEmptyDOMElement();
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(isIntroPlaying()).toBe(false);
  });

  it("renders nothing when it already played in this page load", () => {
    rememberIntroSeen();
    const onReveal = vi.fn();
    const { container } = render(<Intro reducedMotion={false} onReveal={onReveal} />);
    expect(container).toBeEmptyDOMElement();
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("skips on the button: reveals, then removes the layer when the iris completes", () => {
    const onReveal = vi.fn();
    const { container } = render(<Intro reducedMotion={false} onReveal={onReveal} />);
    expect(isIntroPlaying()).toBe(true);
    expect(onReveal).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Saltar intro" }));
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(container).not.toBeEmptyDOMElement();

    const iris = timelines.find((timeline) => timeline.params?.onComplete);
    expect(iris?.speed).toBeGreaterThan(1);
    act(() => iris?.params?.onComplete?.());

    expect(container).toBeEmptyDOMElement();
    expect(isIntroPlaying()).toBe(false);
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(shouldPlayIntro(false)).toBe(false);
  });

  it("skips on Escape", () => {
    const onReveal = vi.fn();
    render(<Intro reducedMotion={false} onReveal={onReveal} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onReveal).toHaveBeenCalledTimes(1);
  });
});
