import { Command } from 'commander';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { Orchestrator } from './core/orchestrator.js';
import { VoirAnimeEpisode } from './extractors/platforms/voiranime.js';
import { SmartDownloader } from './core/downloader.js';
import { extractEpisodeNumber } from './utils.js';
import { Logger } from './utils.js';
import { DEFAULT_MAX_CONCURRENT, DEFAULT_OUTPUT, DEFAULT_PLAYER } from './core/config.js';

export class AnimeDL {
  constructor() {
    this.logger = new Logger();
  }

  parseArgs(argv) {
    const program = new Command();

    program
      .name('anime-dl')
      .description('Download anime episodes from streaming sites')
      .argument('<url>', 'URL to the anime page or episode')
      .option('-o, --output <dir>', 'Output directory', DEFAULT_OUTPUT)
      .option('-s, --start <number>', 'Starting episode number', parseInt)
      .option('-p, --process <number>', 'Max concurrent downloads', parseInt, DEFAULT_MAX_CONCURRENT)
      .option('--player <name>', 'Video player to use', DEFAULT_PLAYER)
      .option('-q, --quality <label>', 'Video quality (e.g. 720, 1080)')
      .option('--debug', 'Enable debug logging', false)
      .parse(argv);

    return {
      url: program.args[0],
      output: program.opts().output,
      start: program.opts().start,
      process: program.opts().process,
      player: program.opts().player,
      quality: program.opts().quality,
      debug: program.opts().debug,
    };
  }

  async run(argv) {
    const args = this.parseArgs(argv);
    this.logger = new Logger(args.debug);

    try {
      await this._handleSeries(args);
    } catch {
      try {
        await this._handleSingleEpisode(args);
      } catch (err) {
        this.logger.error(`Error: ${err.message}`);
        process.exit(1);
      }
    }
  }

  async _handleSeries(args) {
    const orchestrator = new Orchestrator({
      outputDir: args.output,
      maxConcurrent: args.process,
      playerCode: args.player,
      quality: args.quality,
      logger: this.logger,
    });

    const episodes = await orchestrator.getSeriesEpisodes(args.url);

    if (episodes.length === 0) {
      throw new Error('No episodes found');
    }

    const first = episodes[0].number;
    const last = episodes[episodes.length - 1].number;

    let startEp = args.start;
    if (startEp === undefined) {
      this.logger.info(`Available episodes: ${first} - ${last}`);
      const rl = readline.createInterface({ input, output });
      const answer = await rl.question(`Enter starting episode number (${first}-${last}): `);
      rl.close();
      startEp = parseInt(answer, 10);
      if (isNaN(startEp)) {
        startEp = first;
      }
    }

    const toDownload = episodes.filter(ep => ep.number >= startEp);
    this.logger.info(`Downloading ${toDownload.length} episode(s) (${toDownload[0]?.number} - ${toDownload[toDownload.length - 1]?.number})...`);

    await orchestrator.downloadAll(toDownload);
  }

  async _handleSingleEpisode(args) {
    const epNum = extractEpisodeNumber(args.url);
    this.logger.info(`Single episode detected: Episode ${epNum}`);

    const episode = new VoirAnimeEpisode({
      number: epNum,
      name: `Episode ${epNum}`,
      url: args.url,
    });

    const orchestrator = new Orchestrator({
      outputDir: args.output,
      maxConcurrent: 1,
      playerCode: args.player,
      quality: args.quality,
      logger: this.logger,
    });

    const result = await orchestrator.downloadEpisode(episode, null);
    if (result.error) {
      this.logger.error(`Failed: ${result.error}`);
      process.exit(1);
    }
  }
}
