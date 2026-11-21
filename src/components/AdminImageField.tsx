import { ImagePlus, Link2, Loader2, Upload, X } from 'lucide-react';
import { isValidImageLink, type UploadedImageItem } from '../utils/imageUpload';

interface AdminImageFieldProps {
  value: string;
  onChange: (nextUrl: string) => void;
  onUploadFile: (file: File | undefined) => void;
  isUploading: boolean;
  uploadedImages: UploadedImageItem[];
  presets: { label: string; url: string }[];
  selectAriaLabel: string;
  compact?: boolean;
}

export function AdminImageField({
  value,
  onChange,
  onUploadFile,
  isUploading,
  uploadedImages,
  presets,
  selectAriaLabel,
  compact = false,
}: AdminImageFieldProps) {
  const trimmed = value.trim();
  const hasInvalidSyntax = trimmed.length > 0 && !isValidImageLink(trimmed);
  const matchedOption =
    presets.some((p) => p.url === value) || uploadedImages.some((u) => u.url === value)
      ? value
      : '';

  return (
    <div className="space-y-2.5">
      {/* 1. Importer un fichier depuis l'appareil */}
      <label
        className={`w-full inline-flex items-center justify-center gap-2 px-3 ${
          compact ? 'py-2 min-h-[38px]' : 'py-2 min-h-[40px]'
        } bg-[#141414] text-white text-xs font-semibold rounded-lg hover:bg-[#D92323] transition-colors cursor-pointer`}
      >
        {isUploading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : compact ? (
          <ImagePlus className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <Upload className="w-3.5 h-3.5 shrink-0" />
        )}
        <span className="truncate">
          {isUploading ? 'Téléversement en cours...' : 'Importer une photo depuis l’appareil'}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={isUploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            onUploadFile(f);
          }}
          className="sr-only"
        />
      </label>

      {/* 2. Mettre un lien d'image (URL) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600">
            <Link2 className="w-3 h-3 text-[#D92323]" />
            <span>Ou coller un lien d’image (URL)</span>
          </span>
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-[11px] font-semibold text-zinc-500 hover:text-[#D92323] cursor-pointer"
            >
              Effacer
            </button>
          )}
        </div>
        <div className="relative">
          <input
            type="text"
            required
            maxLength={1000}
            value={value}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => onChange(e.target.value.trimStart())}
            placeholder="https://exemple.com/ma-photo.jpg"
            aria-label="Lien URL de l'image"
            className={`w-full pl-3 pr-8 py-2 min-h-[38px] text-xs bg-white border rounded-lg font-mono focus:outline-none ${
              hasInvalidSyntax
                ? 'border-[#D92323] text-[#D92323]'
                : 'border-zinc-300 text-[#141414] focus:border-[#141414]'
            }`}
          />
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label="Vider le lien image"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-[#141414] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {hasInvalidSyntax && (
          <p className="text-[11px] text-[#D92323] font-medium">
            Le lien doit commencer par https://, http:// ou /
          </p>
        )}
      </div>

      {/* 3. Choisir depuis la galerie ou les photos importées */}
      <select
        aria-label={selectAriaLabel}
        value={matchedOption}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
        className="w-full px-2.5 py-2 min-h-[38px] text-xs bg-white border border-zinc-300 rounded-lg text-[#141414]"
      >
        <option value="">— Choisir dans la galerie studio —</option>
        {uploadedImages.length > 0 && (
          <optgroup label="Mes photos importées">
            {uploadedImages.map((u) => (
              <option key={u.url} value={u.url}>
                Importée : {u.name}
              </option>
            ))}
          </optgroup>
        )}
        <optgroup label="Galerie studio">
          {presets.map((preset) => (
            <option key={preset.url} value={preset.url}>
              {preset.label}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}
