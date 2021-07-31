/// <reference path="../types/services.d.ts" />

window.videoIdCount = 100;

// https://regex101.com/r/mPyKKP/1/
window.youtubeRegexPattern =
  /(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be.com\/\S*(?:watch|embed)(?:(?:(?=\/[^&\s\?]+(?!\S))\/)|(?:\S*v=|v\/)))([^&\s\?]+)/.source;

class VideoService {
  YOUTUBE_URL_PREFIX = "https://www.youtube.com/watch?v=";
  THUMBNAIL_URL_PREFIX = "https://i.ytimg.com/vi/";
  THUMBNAIL_URL_SUFFIX = "/default.jpg";

  youtubeServiceURL = globalThis.youtubeServiceURL;

  async fetchVideo(videoId: string) {
    let title = "";
    let channel = "";
    let sessionVideoData = sessionStorage.getItem(videoId);
    if (!sessionVideoData) {
      try {
        const res = await fetch(`${this.youtubeServiceURL}/watch?v=${videoId}`);
        const html = await res.text();
        var parser = new DOMParser();
        var htmlDoc = parser.parseFromString(html, "text/html");
        title =
          htmlDoc.querySelector("meta[name=title]")?.getAttribute("content") ||
          "";
        channel =
          htmlDoc
            .querySelector("[itemprop=author] [itemprop=name]")
            ?.getAttribute("content") || "";
        sessionStorage.setItem(videoId, JSON.stringify({ title, channel }));
      } catch (e) {
        console.log(e);
      }
    } else {
      ({ title, channel } = JSON.parse(sessionVideoData));
    }
    return {
      id: window.videoIdCount++,
      videoId,
      url: this.YOUTUBE_URL_PREFIX + videoId,
      title,
      channel,
      thumbnailUrl: this.getVideoThumbnailUrl(videoId),
    };
  }

  getVideoThumbnailUrl(videoId: string) {
    return this.THUMBNAIL_URL_PREFIX + videoId + this.THUMBNAIL_URL_SUFFIX;
  }

  parseYoutubeId(url: string) {
    const result = RegExp(window.youtubeRegexPattern, "i").exec(url);
    if (result && result.length > 1) {
      return result[1];
    }
    return null;
  }

  parseYoutubeIds(text: string) {
    let matches: RegExpExecArray;
    let videoIds: string[] = [];
    const regex = RegExp(window.youtubeRegexPattern, "ig");
    while ((matches = regex.exec(text))) {
      videoIds.push(matches[1]);
    }
    return videoIds;
  }

  async generatePlaylist(videoIds?: string[]) {
    const id = await window.generatePlaylistId();
    const date = new Date();
    return {
      id,
      title: date.toLocaleString(),
      videos: videoIds || [],
      timestamp: date.getTime(),
    };
  }

  openPlaylistEditor(playlist: Playlist) {
    const previousPage =
      location.hash.length > 0 ? location.hash.substring(1) : "/";
    history.pushState({ playlist, previousPage }, "", "#/editor");
    window.dispatchEvent(new Event("hashchange"));
  }

  PLAYLIST_LIMIT = 50;
  async openPlaylist(videoIds: string[]) {
    const remainingVideoIds = [...videoIds];
    // prettier-ignore
    // @ts-ignore
    const videoIdsChunks = new Array(Math.ceil(remainingVideoIds.length / this.PLAYLIST_LIMIT)).fill().map(_ => remainingVideoIds.splice(0, this.PLAYLIST_LIMIT));
    const settings = await window.getSettings();
    await Promise.all(
      videoIdsChunks.map(async (videoIds) => {
        var url =
          this.youtubeServiceURL +
          "/watch_videos?video_ids=" +
          videoIds.join(",");
        if (settings.openPlaylistPage) {
          const data = await (await fetch(url)).text();
          const exec = /og:video:url[^>]+\?list=([^"']+)/.exec(data);
          if (exec && exec.length > 1) {
            url = "https://www.youtube.com/playlist?list=" + exec[1];
          } else {
            alert(
              "Unable to retrieve playlist id. Directly playing videos instead..."
            );
          }
        }
        if (typeof browser != "undefined") {
          return browser.tabs.create({ url });
        } else {
          window.open(url, "_blank");
        }
      })
    );
  }
}

window.videoService = new VideoService();

export type { VideoService };
