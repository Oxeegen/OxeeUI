/**
 * Branded packaging config: the upstream electron-builder config with the
 * fork's identity layered on top.
 *
 * Spreading upstream rather than forking it means new upstream targets, hooks,
 * and extraResources arrive automatically — only the identity keys are ours.
 *
 * Icons need no override here: brand/scripts/apply-brand-assets.mjs overwrites
 * resources/build/icon.* in place, so upstream's paths already point at brand art.
 *
 * Linux is intentionally AppImage-only. deb/rpm carry an `orca-ide` package name,
 * a PATH symlink, and after-install hooks wired to that name; rebranding those
 * safely is its own change and AppImage covers local distribution today.
 *
 * Env knobs:
 *   BRAND_VERSION  - overrides the packaged version (e.g. from a release tag)
 *   BRAND_PUBLISH  - electron-builder --publish value; defaults to never
 */

const base = require('./electron-builder.config.cjs')
const brand = require('../brand/config/brand.config.json')

const brandVersion = process.env.BRAND_VERSION

module.exports = {
  ...base,
  appId: brand.appId,
  productName: brand.productName,
  ...(brandVersion ? { extraMetadata: { ...base.extraMetadata, version: brandVersion } } : {}),
  win: {
    ...base.win,
    executableName: brand.executableName,
    // Why: upstream signs via SignPath after packaging. A fork has no such
    // pipeline, so claiming their publisherName would make the updater reject
    // our own unsigned artifacts.
    signtoolOptions: undefined
  },
  nsis: {
    ...base.nsis,
    artifactName: `${brand.artifactSlug}-windows-setup.\${ext}`
  },
  dmg: {
    ...base.dmg,
    artifactName: `${brand.artifactSlug}-macos-\${arch}.\${ext}`
  },
  linux: {
    ...base.linux,
    executableName: brand.linuxExecutableName,
    maintainer: brand.maintainer,
    target: ['AppImage'],
    desktop: {
      ...base.linux.desktop,
      entry: {
        ...base.linux.desktop?.entry,
        // Why: Electron derives WM_CLASS from the app name, so this must track
        // productName or GNOME docks stop grouping the window with its launcher.
        StartupWMClass: brand.startupWmClass
      }
    }
  },
  appImage: {
    ...base.appImage,
    artifactName: `${brand.artifactSlug}-linux-\${arch}.\${ext}`
  },
  publish: {
    provider: brand.publish.provider,
    owner: brand.publish.owner,
    repo: brand.publish.repo,
    releaseType: brand.publish.releaseType
  }
}
