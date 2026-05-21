/**
 * Action Schema Tests
 * Tests src/modules/config.js ACTION_SCHEMAS ha_action/ha_data for each major action type.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ACTION_SCHEMAS } from '../config.js';

// Helper to apply normalize then extract ha_action/ha_data
function testAction(type, data) {
  const schema = ACTION_SCHEMAS[type];
  if (!schema) throw new Error(`Unknown action type: ${type}`);
  const normalized = schema.normalize ? schema.normalize(data) : data;
  return {
    ha_action: schema.ha_action(normalized),
    ha_data: schema.ha_data(normalized)
  };
}

describe('ACTION_SCHEMAS', () => {
  // ============== script ==============
  describe('script', () => {
    test('ha_action returns data.action', () => {
      const result = testAction('script', { action: 'script.good_night' });
      assert.strictEqual(result.ha_action, 'script.good_night');
    });

    test('ha_data returns empty object', () => {
      const result = testAction('script', { action: 'script.good_night' });
      assert.deepStrictEqual(result.ha_data, {});
    });
  });

  // ============== switch ==============
  describe('switch', () => {
    test('ha_action returns correct service (toggle/turn_on/turn_off)', () => {
      assert.strictEqual(testAction('switch', { entityId: 'switch.test', operation: 'toggle' }).ha_action, 'switch.toggle');
      assert.strictEqual(testAction('switch', { entityId: 'switch.test', operation: 'turn_on' }).ha_action, 'switch.turn_on');
      assert.strictEqual(testAction('switch', { entityId: 'switch.test', operation: 'turn_off' }).ha_action, 'switch.turn_off');
    });

    test('ha_data returns entity_id', () => {
      const result = testAction('switch', { entityId: 'switch.garden_light', operation: 'toggle' });
      assert.deepStrictEqual(result.ha_data, { entity_id: 'switch.garden_light' });
    });

    test('with device_id targetType returns device_id', () => {
      const result = testAction('switch', { deviceId: 'abc123', operation: 'toggle', targetType: 'device_id' });
      assert.deepStrictEqual(result.ha_data, { device_id: 'abc123' });
    });

    test('with deviceId but no targetType, normalize sets targetType to device_id', () => {
      const result = testAction('switch', { deviceId: 'abc123', operation: 'toggle' });
      assert.deepStrictEqual(result.ha_data, { device_id: 'abc123' });
    });
  });

  // ============== light ==============
  describe('light', () => {
    test('ha_action returns light.toggle', () => {
      const result = testAction('light', { entityId: 'light.living_room', operation: 'toggle' });
      assert.strictEqual(result.ha_action, 'light.toggle');
    });

    test('ha_data includes entity_id', () => {
      const result = testAction('light', { entityId: 'light.living_room', operation: 'toggle' });
      assert.deepStrictEqual(result.ha_data, { entity_id: 'light.living_room' });
    });

    test('ha_data includes brightness_pct for turn_on', () => {
      const result = testAction('light', { entityId: 'light.living_room', operation: 'turn_on', brightness: 75 });
      assert.deepStrictEqual(result.ha_data, { entity_id: 'light.living_room', brightness_pct: '75' });
    });

    test('ha_data does not include brightness_pct when operation is turn_off', () => {
      const result = testAction('light', { entityId: 'light.living_room', operation: 'turn_off', brightness: 75 });
      assert.deepStrictEqual(result.ha_data, { entity_id: 'light.living_room' });
    });
  });

  // ============== cover ==============
  describe('cover', () => {
    test('ha_action for open_cover', () => {
      const result = testAction('cover', { entityId: 'cover.curtain', operation: 'open_cover' });
      assert.strictEqual(result.ha_action, 'cover.open_cover');
    });

    test('ha_action for close_cover', () => {
      const result = testAction('cover', { entityId: 'cover.curtain', operation: 'close_cover' });
      assert.strictEqual(result.ha_action, 'cover.close_cover');
    });

    test('ha_action for set_cover_position with position data', () => {
      const result = testAction('cover', { entityId: 'cover.curtain', operation: 'set_cover_position', position: 50 });
      assert.strictEqual(result.ha_action, 'cover.set_cover_position');
      assert.deepStrictEqual(result.ha_data, { entity_id: 'cover.curtain', position: '50' });
    });
  });

  // ============== media_player ==============
  describe('media_player', () => {
    test('ha_action for play_pause', () => {
      const result = testAction('media_player', { entityId: 'media_player.spotify', operation: 'media_play_pause' });
      assert.strictEqual(result.ha_action, 'media_player.media_play_pause');
    });

    test('ha_action for next_track', () => {
      const result = testAction('media_player', { entityId: 'media_player.spotify', operation: 'media_next_track' });
      assert.strictEqual(result.ha_action, 'media_player.media_next_track');
    });

    test('ha_data with device_id targetType', () => {
      const result = testAction('media_player', { deviceId: 'dev123', operation: 'media_play_pause', targetType: 'device_id' });
      assert.deepStrictEqual(result.ha_data, { device_id: 'dev123' });
    });
  });

  // ============== climate ==============
  describe('climate', () => {
    test('ha_action for turn_on', () => {
      assert.strictEqual(testAction('climate', { entityId: 'climate.living', operation: 'turn_on' }).ha_action, 'climate.turn_on');
    });

    test('ha_action for turn_off', () => {
      assert.strictEqual(testAction('climate', { entityId: 'climate.living', operation: 'turn_off' }).ha_action, 'climate.turn_off');
    });

    test('ha_action for set_hvac_mode with hvacMode data', () => {
      const result = testAction('climate', { entityId: 'climate.living', operation: 'set_hvac_mode', hvacMode: 'cool' });
      assert.strictEqual(result.ha_action, 'climate.set_hvac_mode');
      assert.deepStrictEqual(result.ha_data, { entity_id: 'climate.living', hvac_mode: 'cool' });
    });

    test('ha_action for set_temperature with temperature data', () => {
      const result = testAction('climate', { entityId: 'climate.living', operation: 'set_temperature', temperature: 22 });
      assert.strictEqual(result.ha_action, 'climate.set_temperature');
      assert.deepStrictEqual(result.ha_data, { entity_id: 'climate.living', temperature: '22' });
    });
  });

  // ============== fan ==============
  describe('fan', () => {
    test('ha_action for turn_on', () => {
      assert.strictEqual(testAction('fan', { entityId: 'fan.bedroom', operation: 'turn_on' }).ha_action, 'fan.turn_on');
    });

    test('ha_action for turn_off', () => {
      assert.strictEqual(testAction('fan', { entityId: 'fan.bedroom', operation: 'turn_off' }).ha_action, 'fan.turn_off');
    });

    test('ha_action for set_percentage with percentage data', () => {
      const result = testAction('fan', { entityId: 'fan.bedroom', operation: 'set_percentage', percentage: 60 });
      assert.strictEqual(result.ha_action, 'fan.set_percentage');
      assert.deepStrictEqual(result.ha_data, { entity_id: 'fan.bedroom', percentage: '60' });
    });
  });

  // ============== custom ==============
  describe('custom', () => {
    test('normalize sets targetType default to entity_id', () => {
      const schema = ACTION_SCHEMAS.custom;
      const normalized = schema.normalize({ entityId: 'light.test', action: 'light.turn_on' });
      assert.strictEqual(normalized.targetType, 'entity_id');
    });

    test('ha_action returns data.action', () => {
      const result = testAction('custom', { entityId: 'light.test', action: 'light.turn_on', targetType: 'entity_id' });
      assert.strictEqual(result.ha_action, 'light.turn_on');
    });

    test('ha_data with entity_id + device_id + dataJson', () => {
      const result = testAction('custom', {
        targetType: 'entity_id',
        entityId: 'light.living_room',
        deviceId: '',
        action: 'light.turn_on',
        dataJson: '{"brightness": 255}'
      });
      assert.strictEqual(result.ha_action, 'light.turn_on');
      assert.deepStrictEqual(result.ha_data, { entity_id: 'light.living_room', brightness: 255 });
    });

    test('ha_data with device_id targetType includes device_id', () => {
      const result = testAction('custom', {
        targetType: 'device_id',
        entityId: '',
        deviceId: 'abc123def456',
        action: 'homeassistant.toggle',
        dataJson: ''
      });
      assert.deepStrictEqual(result.ha_data, { device_id: 'abc123def456' });
    });

    test('ha_data with no targetType gets normalize default entity_id', () => {
      const result = testAction('custom', { entityId: 'switch.test', action: 'switch.toggle' });
      assert.strictEqual(result.ha_action, 'switch.toggle');
    });
  });

  // ============== input_select ==============
  describe('input_select', () => {
    test('ha_action for select_first', () => {
      assert.strictEqual(testAction('input_select', { entityId: 'input_select.mode', operation: 'select_next' }).ha_action, 'input_select.select_next');
    });

    test('ha_action for select_last', () => {
      assert.strictEqual(testAction('input_select', { entityId: 'input_select.mode', operation: 'select_previous' }).ha_action, 'input_select.select_previous');
    });

    test('ha_action for select_option with option data', () => {
      const result = testAction('input_select', { entityId: 'input_select.scene', operation: 'select_option', option: 'Evening' });
      assert.strictEqual(result.ha_action, 'input_select.select_option');
      assert.deepStrictEqual(result.ha_data, { entity_id: 'input_select.scene', option: 'Evening' });
    });

    test('select_option without option still returns entity_id', () => {
      const result = testAction('input_select', { entityId: 'input_select.scene', operation: 'select_option' });
      assert.deepStrictEqual(result.ha_data, { entity_id: 'input_select.scene' });
    });
  });

  // ============== scene ==============
  describe('scene', () => {
    test('ha_action returns scene.turn_on', () => {
      const result = testAction('scene', { entityId: 'scene.movie_night' });
      assert.strictEqual(result.ha_action, 'scene.turn_on');
    });

    test('ha_data returns entity_id', () => {
      const result = testAction('scene', { entityId: 'scene.movie_night' });
      assert.deepStrictEqual(result.ha_data, { entity_id: 'scene.movie_night' });
    });
  });

  // ============== automation ==============
  describe('automation', () => {
    test('ha_action returns automation.trigger', () => {
      const result = testAction('automation', { entityId: 'automation.im_wake' });
      assert.strictEqual(result.ha_action, 'automation.trigger');
    });

    test('ha_data returns entity_id', () => {
      const result = testAction('automation', { entityId: 'automation.im_wake' });
      assert.deepStrictEqual(result.ha_data, { entity_id: 'automation.im_wake' });
    });
  });
});