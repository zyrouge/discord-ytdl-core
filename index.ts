import ytdl, { downloadOptions } from "ytdl-core";
import { Readable } from "stream";
import prism from "prism-media";

interface StreamOptions extends downloadOptions {
    seek?: number;
    encoderArgs?: any[];
};

/**
  * Create an opus stream for your video with provided encoder args
  * @param url - YouTube URL of the video (or ReadableStream)
  * @param options - YTDL options
  * @param [options.seek] seek - Time in seconds to seek
  * @param [options.encoderArgs] encoderArgs - FFmpeg encoder args
  * @returns {Stream}
  * @example ```js
  * const ytdl = require("discord-ytdl-core");
  * const stream = ytdl("VIDEO_URL", {
  *     seek: 3,
  *     encoderArgs: ["-af", "bass=g=10"]
  * });
  * VoiceConnection.play(stream, {
  *     type: "opus"
  * });```
  */
const StreamManager = (url: any, options: StreamOptions) => {
    if (!url) {
        throw new Error("No input url provided");
    }
    if (typeof url !== "string" || !(url instanceof Readable)) {
        throw new Error(`input must be a string or ReadableStream. Received ${typeof url}!`);
    }

    let FFmpegArgs: string[] = [
        "-analyzeduration", "0",
        "-loglevel", "0",
        "-f", "s16le",
        "-ar", "48000",
        "-ac", "2"
    ];

    if (options && options.seek && !isNaN(options.seek)) {
        FFmpegArgs.unshift("-ss", options.seek.toString());
    }

    if (options && options.encoderArgs && Array.isArray(options.encoderArgs)) {
        FFmpegArgs = FFmpegArgs.concat(options.encoderArgs);
    }

    const transcoder = new prism.FFmpeg({
        args: FFmpegArgs
    });

    const inputStream = (url instanceof Readable) ? url : ytdl(url, options);
    const output = inputStream.pipe(transcoder);

    const opus = new prism.opus.Encoder({
        rate: 48000,
        channels: 2,
        frameSize: 960
    });

    const outputStream = output.pipe(opus);

    outputStream.on('close', () => {
        transcoder.destroy();
        opus.destroy();
    });
    return outputStream;
};

const DiscordYTDLCore = Object.assign(StreamManager, ytdl);

export = DiscordYTDLCore;

