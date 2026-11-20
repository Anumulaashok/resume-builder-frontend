import '@testing-library/jest-dom';

afterEach(() => {
  if (typeof window !== 'undefined' && window.history?.replaceState) {
    window.history.replaceState(null, '', '/');
  }
});
