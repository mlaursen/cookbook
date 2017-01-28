/* eslint-env jest */

const store = {
  getState: jest.fn(() => ({
    etags: {
      '/items/1': '"etag1"',
      '/items/1/subitems': '"etag2"',
      '/items/3': null,
    },
    counts: {
      '/items': 32,
      '/items/1/subitems': 10,
      '/subitems': 0,
    },
  })),
  dispatch: jest.fn(),
};

export default store;
