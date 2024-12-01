import { XIcon } from "lucide-react";
import { DropzoneOptions } from "react-dropzone";

import { Button } from "./ui/button";
import { FileInput, FileUploader } from "./ui/file-upload";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type PublicationDetails = {
  investigator?: string;
  publisher?: string;
  publisherLocation?: string;
  editionNumber?: string;
  publicationYear?: number;
};

type ExternalVersion = {
  type: "external";
  url: string;
} & PublicationDetails;

type PdfVersion = {
  type: "pdf";
  mode: "upload" | "url";
  files: File[];
  url?: string;
  ocrBookId?: string;
} & PublicationDetails;

type TurathVersion = {
  type: "turath";
  value: string;
} & PublicationDetails;

type OpenitiVersion = {
  type: "openiti";
  value: string;
} & PublicationDetails;

export type Version =
  | ExternalVersion
  | PdfVersion
  | TurathVersion
  | OpenitiVersion;

const MAX_FILE_SIZE_IN_MB = 300;
const dropzoneOptions = {
  accept: {
    "application/pdf": [".pdf"],
  },
  multiple: true,
  maxFiles: 30,
  maxSize: MAX_FILE_SIZE_IN_MB * 1024 * 1024,
} satisfies DropzoneOptions;

export const makeVersionsInitialState = (): Version[] => {
  return [
    {
      type: "pdf",
      mode: "upload",
      files: [],
    },
  ];
};

export default function VersionsInput({
  versions,
  setVersions,
  disabled,
}: {
  versions: Version[];
  setVersions: (versions: Version[]) => void;
  disabled?: boolean;
}) {
  const fieldChangeHandler = <
    T extends keyof ExternalVersion | keyof PdfVersion,
  >(
    idx: number,
    field: T,
    value: T extends keyof ExternalVersion ? ExternalVersion[T] : PdfVersion[T],
  ) => {
    const newVersions = [...versions];
    (newVersions[idx] as any)![field]! = value;
    setVersions(newVersions);
  };

  const renderPublicationDetails = (idx: number) => {
    const version = versions[idx]!;
    const isReadonly = version.type === "turath" || version.type === "openiti";

    return (
      <div className="mt-10">
        <h3 className="text-lg font-semibold">Publication Details</h3>
        <div className="mt-5 grid grid-cols-2 gap-10">
          <div className="space-y-2">
            <Label htmlFor={`version-${idx}.investigator`}>
              Investigator (المحقق)
            </Label>
            <Input
              disabled={disabled || isReadonly}
              id={`version-${idx}.investigator`}
              className="bg-white"
              value={version?.investigator}
              onChange={
                isReadonly
                  ? undefined
                  : (e) =>
                      fieldChangeHandler(idx, "investigator", e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`version-${idx}.publisher`}>
              Publisher (دار النشر)
            </Label>
            <Input
              id={`version-${idx}.publisher`}
              disabled={disabled || isReadonly}
              value={version?.publisher}
              className="bg-white"
              onChange={
                isReadonly
                  ? undefined
                  : (e) => fieldChangeHandler(idx, "publisher", e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`version-${idx}.publisherLocation`}>
              Publisher Location (مدينة النشر)
            </Label>
            <Input
              id={`version-${idx}.publisherLocation`}
              disabled={disabled || isReadonly}
              value={version?.publisherLocation}
              className="bg-white"
              onChange={
                isReadonly
                  ? undefined
                  : (e) =>
                      fieldChangeHandler(
                        idx,
                        "publisherLocation",
                        e.target.value,
                      )
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`version-${idx}.editionNumber`}>
              Edition Number (رقم الطبعة)
            </Label>
            <Input
              disabled={disabled || isReadonly}
              id={`version-${idx}.editionNumber`}
              className="bg-white"
              value={version?.editionNumber}
              onChange={
                isReadonly
                  ? undefined
                  : (e) =>
                      fieldChangeHandler(idx, "editionNumber", e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`version-${idx}.publicationYear`}>
              Publication Year (سنة النشر)
            </Label>
            <Input
              disabled={disabled || isReadonly}
              id={`version-${idx}.publicationYear`}
              type="number"
              className="bg-white"
              value={version?.publicationYear}
              onChange={
                isReadonly
                  ? undefined
                  : (e) => {
                      const newValue = e.target.value.trim();
                      fieldChangeHandler(
                        idx,
                        "publicationYear",
                        newValue ? Number(newValue) : undefined,
                      );
                    }
              }
            />
          </div>
        </div>
      </div>
    );
  };

  const addPdfVersion = () => {
    setVersions([
      ...versions,
      {
        type: "pdf",
        mode: "upload",
        files: [],
      },
    ]);
  };

  const addExternalVersion = () => {
    setVersions([
      ...versions,
      {
        type: "external",
        url: "",
      },
    ]);
  };

  return (
    <div>
      <div>
        <h2 className="text-2xl font-bold">Versions</h2>

        <div className="mt-5 flex flex-col gap-5">
          {versions.map((version, idx) => {
            let content;
            if (version.type === "turath" || version.type === "openiti") {
              content = (
                <>
                  <div className="space-y-4">
                    <Label
                      htmlFor={`version-${idx}.url`}
                      className="text-lg font-semibold"
                    >
                      {version.type === "turath" ? "Turath" : "Openiti"}
                    </Label>

                    <Input
                      disabled
                      id={`version-${idx}.url`}
                      className="bg-white"
                      value={version.value}
                    />
                  </div>
                </>
              );
            }

            if (version.type === "external") {
              content = (
                <>
                  <div className="space-y-4">
                    <Label
                      htmlFor={`version-${idx}.url`}
                      className="text-lg font-semibold"
                    >
                      External Digitized Book URL
                    </Label>

                    <Input
                      disabled={disabled}
                      id={`version-${idx}.url`}
                      className="bg-white"
                      value={version.url}
                      onChange={(e) =>
                        fieldChangeHandler(idx, "url", e.target.value)
                      }
                    />
                  </div>
                </>
              );
            }

            if (version.type === "pdf") {
              const typedVersion = version as Version & { type: "pdf" };
              content = (
                <>
                  <div className="flex items-center gap-2">
                    <Label
                      className="text-lg font-semibold"
                      htmlFor={`version-${idx}.input`}
                    >
                      PDF
                    </Label>

                    <Button
                      size="sm"
                      variant="secondary"
                      type="button"
                      onClick={() => fieldChangeHandler(idx, "mode", "url")}
                      disabled={disabled}
                    >
                      {typedVersion.mode === "upload"
                        ? "Mode: Upload"
                        : "Mode: URL"}
                    </Button>
                  </div>

                  <div>
                    {typedVersion.mode === "upload" ? (
                      <>
                        {typedVersion.files.length > 0 ? (
                          <div className="my-4 flex flex-col">
                            {typedVersion.files.map((file, idx) => (
                              <div key={idx}>
                                <span className="flex-shrink-0">
                                  {file.name} (
                                  {(file.size / 1024 / 1024).toFixed(1)} MB)
                                </span>

                                <Button
                                  type="button"
                                  onClick={() => {
                                    const newFiles = typedVersion.files.filter(
                                      (f, fIdx) => fIdx !== idx,
                                    );
                                    fieldChangeHandler(idx, "files", newFiles);
                                  }}
                                >
                                  <XIcon className="size-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        <FileUploader
                          id={`version-${idx}.input`}
                          value={typedVersion.files}
                          onValueChange={(files) =>
                            fieldChangeHandler(idx, "files", files ?? [])
                          }
                          dropzoneOptions={{
                            ...dropzoneOptions,
                            disabled,
                          }}
                        >
                          <FileInput>
                            <div className="mt-4 flex h-32 w-full items-center justify-center rounded-md border bg-background">
                              <p className="text-gray-400">Drop files here</p>
                            </div>
                          </FileInput>
                        </FileUploader>
                      </>
                    ) : (
                      <div className="mt-4">
                        <Input
                          id={`version-${idx}.input`}
                          placeholder="Enter PDF Url"
                          className="bg-white"
                          type="url"
                          value={typedVersion.url}
                          onChange={(e) =>
                            fieldChangeHandler(idx, "url", e.target.value)
                          }
                          disabled={disabled}
                        />
                      </div>
                    )}
                  </div>
                </>
              );
            }

            return (
              <div className="relative rounded-md bg-gray-50 px-8 py-4">
                {/* Don't show remove button for turath and openiti versions */}
                {version.type !== "turath" && version.type !== "openiti" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2"
                    disabled={disabled}
                    onClick={() => {
                      const newVersions = versions.filter(
                        (_, vIdx) => vIdx !== idx,
                      );
                      setVersions(newVersions);
                    }}
                  >
                    <XIcon className="size-4" />
                  </Button>
                )}

                {content}
                {renderPublicationDetails(idx)}
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={addPdfVersion}
            disabled={disabled}
          >
            Add PDF Version
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={addExternalVersion}
            disabled={disabled}
          >
            Add External Version
          </Button>
        </div>
      </div>
    </div>
  );
}
