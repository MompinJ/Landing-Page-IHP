// Puente htm + React (vendorizado como global UMD). Sin JSX, sin build.
import htm from '../vendor/htm.module.js';

export const React = window.React;
export const html = htm.bind(window.React.createElement);
export const { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } = window.React;
