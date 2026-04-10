import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameStateMachine, GameState } from '../src/state/GameStateMachine';

// Minimal stub for CanvasRenderingContext2D (tests don't need actual rendering)
const fakeCtx = {} as CanvasRenderingContext2D;

describe('GameStateMachine — construction', () => {
  it('starts in ATTRACT state by default', () => {
    const sm = new GameStateMachine();
    expect(sm.state).toBe(GameState.ATTRACT);
  });

  it('accepts a custom initial state', () => {
    const sm = new GameStateMachine(GameState.QUALIFYING);
    expect(sm.state).toBe(GameState.QUALIFYING);
  });
});

describe('GameStateMachine — register and dispatch', () => {
  let sm: GameStateMachine;

  beforeEach(() => {
    sm = new GameStateMachine(GameState.ATTRACT);
  });

  it('calls update handler for the active state', () => {
    const updateSpy = vi.fn();
    sm.register(GameState.ATTRACT, { update: updateSpy, render: vi.fn() });

    sm.update(16);

    expect(updateSpy).toHaveBeenCalledOnce();
    expect(updateSpy).toHaveBeenCalledWith(16);
  });

  it('calls render handler for the active state', () => {
    const renderSpy = vi.fn();
    sm.register(GameState.ATTRACT, { update: vi.fn(), render: renderSpy });

    sm.render(fakeCtx);

    expect(renderSpy).toHaveBeenCalledOnce();
    expect(renderSpy).toHaveBeenCalledWith(fakeCtx);
  });

  it('does not call handlers for inactive states', () => {
    const attractUpdate = vi.fn();
    const qualifyingUpdate = vi.fn();
    sm.register(GameState.ATTRACT, { update: attractUpdate, render: vi.fn() });
    sm.register(GameState.QUALIFYING, { update: qualifyingUpdate, render: vi.fn() });

    sm.update(16);

    expect(attractUpdate).toHaveBeenCalledOnce();
    expect(qualifyingUpdate).not.toHaveBeenCalled();
  });

  it('update is a no-op when no handler is registered for current state', () => {
    // No handler registered — should not throw
    expect(() => sm.update(16)).not.toThrow();
  });

  it('render is a no-op when no handler is registered for current state', () => {
    expect(() => sm.render(fakeCtx)).not.toThrow();
  });
});

describe('GameStateMachine — transition', () => {
  let sm: GameStateMachine;

  beforeEach(() => {
    sm = new GameStateMachine(GameState.ATTRACT);
  });

  it('changes the active state', () => {
    sm.register(GameState.ATTRACT, { update: vi.fn(), render: vi.fn() });
    sm.register(GameState.QUALIFYING, { update: vi.fn(), render: vi.fn() });

    sm.transition(GameState.QUALIFYING);

    expect(sm.state).toBe(GameState.QUALIFYING);
  });

  it('calls onExit on the leaving state', () => {
    const onExit = vi.fn();
    sm.register(GameState.ATTRACT, { update: vi.fn(), render: vi.fn(), onExit });
    sm.register(GameState.QUALIFYING, { update: vi.fn(), render: vi.fn() });

    sm.transition(GameState.QUALIFYING);

    expect(onExit).toHaveBeenCalledOnce();
  });

  it('calls onEnter on the arriving state', () => {
    const onEnter = vi.fn();
    sm.register(GameState.ATTRACT, { update: vi.fn(), render: vi.fn() });
    sm.register(GameState.QUALIFYING, { update: vi.fn(), render: vi.fn(), onEnter });

    sm.transition(GameState.QUALIFYING);

    expect(onEnter).toHaveBeenCalledOnce();
  });

  it('calls onExit before onEnter', () => {
    const order: string[] = [];
    sm.register(GameState.ATTRACT, {
      update: vi.fn(),
      render: vi.fn(),
      onExit: () => order.push('exit'),
    });
    sm.register(GameState.QUALIFYING, {
      update: vi.fn(),
      render: vi.fn(),
      onEnter: () => order.push('enter'),
    });

    sm.transition(GameState.QUALIFYING);

    expect(order).toEqual(['exit', 'enter']);
  });

  it('dispatches update to the new state after transition', () => {
    const attractUpdate = vi.fn();
    const qualifyingUpdate = vi.fn();
    sm.register(GameState.ATTRACT, { update: attractUpdate, render: vi.fn() });
    sm.register(GameState.QUALIFYING, { update: qualifyingUpdate, render: vi.fn() });

    sm.transition(GameState.QUALIFYING);
    sm.update(16);

    expect(attractUpdate).not.toHaveBeenCalled();
    expect(qualifyingUpdate).toHaveBeenCalledOnce();
  });

  it('transitioning to the same state calls onExit then onEnter', () => {
    const onExit = vi.fn();
    const onEnter = vi.fn();
    sm.register(GameState.ATTRACT, { update: vi.fn(), render: vi.fn(), onExit, onEnter });

    sm.transition(GameState.ATTRACT);

    expect(onExit).toHaveBeenCalledOnce();
    expect(onEnter).toHaveBeenCalledOnce();
  });

  it('transition does not throw when current state has no handlers', () => {
    // ATTRACT has no registered handlers yet
    sm.register(GameState.QUALIFYING, { update: vi.fn(), render: vi.fn() });
    expect(() => sm.transition(GameState.QUALIFYING)).not.toThrow();
    expect(sm.state).toBe(GameState.QUALIFYING);
  });

  it('transition does not throw when next state has no handlers', () => {
    sm.register(GameState.ATTRACT, { update: vi.fn(), render: vi.fn() });
    // QUALIFYING has no handlers
    expect(() => sm.transition(GameState.QUALIFYING)).not.toThrow();
    expect(sm.state).toBe(GameState.QUALIFYING);
  });
});

describe('GameStateMachine — full state sequence', () => {
  it('can walk through all states', () => {
    const sm = new GameStateMachine(GameState.ATTRACT);
    const allStates = Object.values(GameState);

    // Register a no-op handler for every state
    for (const s of allStates) {
      sm.register(s, { update: vi.fn(), render: vi.fn() });
    }

    // Walk through each state in order
    for (const s of allStates) {
      sm.transition(s);
      expect(sm.state).toBe(s);
    }
  });
});

describe('GameStateMachine — re-registration', () => {
  it('replaces handlers when registered a second time', () => {
    const sm = new GameStateMachine(GameState.ATTRACT);

    const firstUpdate = vi.fn();
    const secondUpdate = vi.fn();
    sm.register(GameState.ATTRACT, { update: firstUpdate, render: vi.fn() });
    sm.register(GameState.ATTRACT, { update: secondUpdate, render: vi.fn() });

    sm.update(16);

    expect(firstUpdate).not.toHaveBeenCalled();
    expect(secondUpdate).toHaveBeenCalledOnce();
  });
});
