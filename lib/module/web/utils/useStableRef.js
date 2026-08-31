"use strict";

import { useEffect, useRef } from 'react';

//TODO: When upgrading to React 19.2 migrate to useEffectEvent instead
export const useStableRef = value => {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
};
//# sourceMappingURL=useStableRef.js.map