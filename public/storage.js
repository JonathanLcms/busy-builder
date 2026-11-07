const Store = {
  KEY: 'busybuilder_v1',

  sampleTodayItems: [
    'Math homework - 45 min',
    'Soccer practice 4:00-5:30 PM',
    'Eat dinner - 30 min',
    'Read chapter 5 of science book - 20 min',
  ],

  sampleWeekDays: {
    mon: 'Soccer practice 4:00-5:30 PM',
    wed: 'Soccer practice 4:00-5:30 PM',
    sat: 'Clean my room - 15 min',
    any: 'Math homework - 45 min\nEat dinner - 30 min\nRead chapter 5 of science book - 20 min',
  },

  load() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || {};
    } catch {
      return {};
    }
  },

  saveAll(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  get(field, fallback) {
    const data = this.load();
    return field in data ? data[field] : fallback;
  },

  set(field, value) {
    const data = this.load();
    data[field] = value;
    this.saveAll(data);
  },

  remove(field) {
    const data = this.load();
    delete data[field];
    this.saveAll(data);
  },
};
