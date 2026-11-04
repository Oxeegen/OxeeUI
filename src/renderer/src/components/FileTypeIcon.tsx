import { createElement, type CSSProperties } from 'react'
import { Folder, FolderOpen } from 'lucide-react'
import {
  getFileTypeIcon,
  getPluginFileTypeIconIndex,
  getPluginFolderIconIndex
} from '@/lib/file-type-icons'
import { PLUGIN_ICON_ATTRIBUTE, useActivePluginIconTheme } from '@/store/plugin-icon-themes'
import { BrandFolderIcon } from '@brand/file-icons/material-file-icons'

type IconProps = { className?: string; style?: CSSProperties }

function PluginIcon({ index, className, style }: IconProps & { index: number }): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      {...{ [PLUGIN_ICON_ATTRIBUTE]: index }}
      className={className}
      style={style}
    />
  )
}

/** The icon for a file path; one component so icon sources can change in one place. */
export function FileTypeIcon({
  filePath,
  className,
  style
}: IconProps & { filePath: string | null | undefined }): React.JSX.Element {
  const index = getPluginFileTypeIconIndex(
    useActivePluginIconTheme((s) => s.theme),
    filePath
  )
  return index === null ? (
    createElement(getFileTypeIcon(filePath), { 'aria-hidden': true, className, style })
  ) : (
    <PluginIcon index={index} className={className} style={style} />
  )
}

/** A folder's icon; `folderPath` lets an icon theme pick one for its name, such as `src`. */
export function FolderIcon({
  folderPath,
  open,
  className,
  style
}: IconProps & { folderPath?: string; open: boolean }): React.JSX.Element {
  const index = getPluginFolderIconIndex(
    useActivePluginIconTheme((s) => s.theme),
    folderPath,
    open
  )
  if (index !== null) {
    return <PluginIcon index={index} className={className} style={style} />
  }
  // Why: without an icon-theme plugin, OxeeUI draws Material Icon Theme folders
  // (brand/file-icons). One hook here covers every folder row in the app. A caller
  // passing `style` keeps upstream's glyph, since the brand icon does not take one.
  return style === undefined ? (
    <BrandFolderIcon name={folderPath ?? ''} expanded={open} className={className} />
  ) : (
    createElement(open ? FolderOpen : Folder, { 'aria-hidden': true, className, style })
  )
}
