import { useState, useCallback } from 'react';

export default function useHistory(initialState) {
  const [state, setState] = useState(initialState);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const set = useCallback((newS, overwrite = false) => {
    const newState = typeof newS === 'function' ? newS(state) : newS;

    if (overwrite) {
      setState(newState);
      return;
    }

    setPast((prevPast) => [...prevPast, state]);
    setState(newState);
    setFuture([]);
  }, [state]);

  const undo = useCallback(() => {
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setFuture((prevFuture) => [state, ...prevFuture]);
    setPast(newPast);
    setState(previous);
  }, [past, state]);

  const redo = useCallback(() => {
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    setPast((prevPast) => [...prevPast, state]);
    setFuture(newFuture);
    setState(next);
  }, [future, state]);

  return { state, set, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
}
