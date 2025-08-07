/**
 * @name FakeNitro
 * @version 1.1.0
 * @author Ra6cool
 * @description Allows sending emojis and stickers from other servers without Nitro by fetching their URLs and injecting them into messages.
 * @source https://github.com/Ra6cool/FakeNitro
 * @updateUrl https://raw.githubusercontent.com/Ra6cool/FakeNitro/master/FakeNitro.plugin.js
 */

module.exports = (() => {
  const config = {
    info: {
      name: 'FakeNitro',
      authors: [{ name: 'Ra6cool' }],
      version: '1.1.0',
      description: 'Send emojis and stickers from any server without Nitro',
      github: 'https://github.com/Ra6cool/FakeNitro',
      github_raw: 'https://raw.githubusercontent.com/Ra6cool/FakeNitro/master/FakeNitro.plugin.js'
    }
  };

  return (!global.ZeresPluginLibrary) ? class {
    constructor() { this._config = config; }
    getName() { return config.info.name; }
    getAuthor() { return config.info.authors.map(a => a.name).join(', '); }
    getVersion() { return config.info.version; }
    load() {
      BdApi.showConfirmationModal(
        'ZeresPluginLibrary Missing',
        `The library plugin needed for ${config.info.name} is missing. Please download it!`,
        { confirmText: 'Download', cancelText: 'Cancel', onConfirm: () => {
            require('request').get(
              'https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js',
              (e, r, b) => {
                if (!e) require('fs').writeFileSync(
                  require('path').join(BdApi.Plugins.folder, '0PluginLibrary.plugin.js'), b
                );
              }
            );
          }
        }
      );
    }
    start() {}
    stop() {}
  } : (([Plugin, Library]) => {
    const { Patcher, WebpackModules } = Library;
    const MessageActions = WebpackModules.getByProps('sendMessage');
    const EmojiStore = WebpackModules.getByProps('getEmoji', 'getGuildEmoji');
    const StickerModule = WebpackModules.getByProps('getStickers');

    return class FakeNitro extends Plugin {
      onStart() {
        this.patchSend();
      }

      onStop() {
        Patcher.unpatchAll(this.getName());
      }

      patchSend() {
        Patcher.instead(
          this.getName(),
          MessageActions,
          'sendMessage',
          (thisObject, [channelId, message], original) => {
            message.content = this.processEmojis(message.content);
            message.content = this.processStickers(message.content);
            return original(thisObject, [channelId, message]);
          }
        );
      }

      processEmojis(text) {
        return text.replace(/:(\w+?):/g, (match, name) => {
          const emoji = this.findEmojiByName(name);
          return emoji ? `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>` : match;
        });
      }

      processStickers(text) {
        return text.replace(/;(\w+?);/g, (match, name) => {
          const sticker = this.findStickerByName(name);
          if (sticker) {
            const url = `https://cdn.discordapp.com/stickers/${sticker.id}.png?size=96`;
            return `![${name}](${url})`;
          }
          return match;
        });
      }

      findEmojiByName(name) {
        const all = EmojiStore.getGuildEmoji();
        for (const guildId in all) {
          for (const emoji of all[guildId]) {
            if (emoji.name === name) return emoji;
          }
        }
        return null;
      }

      findStickerByName(name) {
        const store = StickerModule.getStickers();
        for (const guildId in store) {
          for (const sticker of store[guildId]) {
            if (sticker.name === name) return sticker;
          }
        }
        return null;
      }
    };
  })(global.ZeresPluginLibrary.buildPlugin(config));
})();
