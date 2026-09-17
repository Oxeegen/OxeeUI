/**
 * Branded packaging config: the upstream electron-builder config with the
 * fork's identity layered on top.
 *
 * Spreading upstream rather than forking it means new upstream targets, hooks,
 * and extraResources arrive automatically — only the identity keys are ours.
 *
 * Icons point at the brand PNG rather than upstream's .icns: electron-builder
 * derives both .icns and .ico from a 1024px PNG, which avoids committing two
 * container formats that no tool on a Linux dev box can author.
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
const BRAND_ICON = 'resources/build/icon.png'

module.exports = {
  ...base,
  appId: brand.appId,
  productName: brand.productName,
  mac: {
    ...base.mac,
    icon: BRAND_ICON
  },
  // Why extraMetadata rather than editing package.json: electron-builder reads
  // description, author, homepage, and license from the packaged manifest, and
  // package.json is upstream's highest-churn file — 1034 commits in six months.
  // Overriding at package time keeps that diff at zero.
  extraMetadata: {
    ...base.extraMetadata,
    // Why the packaged name, not only productName: electron-builder names the
    // per-user Windows install folder (%LOCALAPPDATA%\Programs\<name>) and the
    // update download cache (%LOCALAPPDATA%\<name>-updater) after the manifest
    // `name`, which package.json leaves as upstream's `orca`. So installing OxeeUI
    // overwrote an installed upstream app in place. The source package.json keeps
    // `orca`: the workspace, scripts and CLI depend on it.
    //
    // Existing installs do not move: the installer reuses the InstallLocation
    // stored under the app's GUID, which derives from appId, not from this name.
    name: brand.artifactSlug,
    description: brand.description,
    author: brand.author,
    homepage: brand.homepage,
    license: brand.license,
    ...(brandVersion ? { version: brandVersion } : {})
  },
  // Why explicit: without it electron-builder derives the copyright from the
  // packaged author, which would credit upstream for this build. MIT requires the
  // upstream notice to travel with the product, so it is named here too.
  copyright: brand.copyright,
  win: {
    ...base.win,
    icon: BRAND_ICON,
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
    icon: BRAND_ICON,
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
