import {ActorRdfDereference, IActionRdfDereference, IActorRdfDereferenceOutput} from "@comunica/bus-rdf-dereference";
import {
  ActorRdfParse,
  IActionRootRdfParse,
  IActorOutputRootRdfParse,
  IActorTestRootRdfParse,
} from "@comunica/bus-rdf-parse";
import {IActorArgs, IActorTest, Mediator} from "@comunica/core";
import * as fs from "fs";
import * as path from "path";
import {URL} from "url";
import {promisify} from "util";

/**
 * A comunica File RDF Dereference Actor.
 */
export class ActorRdfDereferenceFile extends ActorRdfDereference {

  public readonly mediatorRdfParse: Mediator<ActorRdfParse,
    IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;

  public readonly mediaMappings: { [id: string]: string };

  constructor(args: IActorRdfDereferenceFileArgs) {
    super(args);
  }

  public async test(action: IActionRdfDereference): Promise<IActorTest> {
    try {
      await promisify(fs.access)(
        action.url.startsWith('file://') ? new URL(action.url) : action.url, fs.constants.F_OK);
    } catch (e) {
      throw new Error(
        'This actor only works on existing local files. (' + e + ')');
    }
    return true;
  }

  public async run(action: IActionRdfDereference): Promise<IActorRdfDereferenceOutput> {
    let mediaType = action.mediaType;

    // deduce media type from file extension if possible
    if (!mediaType) {
      const ext = path.extname(action.url);
      if (ext) {
        // ignore dot
        mediaType = this.mediaMappings[ext.substring(1)];
      }
    }

    const parseAction: IActionRootRdfParse = {
      context: action.context,
      handle: { input: fs.createReadStream(action.url.startsWith('file://') ? new URL(action.url) : action.url) },
    };
    if (mediaType) {
      parseAction.handleMediaType = mediaType;
    }

    const handle = (await this.mediatorRdfParse.mediate(parseAction)).handle;

    return {
      pageUrl: action.url,
      quads: handle.quads,
      triples: handle.triples,
    };
  }
}

export interface IActorRdfDereferenceFileArgs
  extends IActorArgs<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput> {

  /**
   * Mediator used for parsing the file contents.
   */
  mediatorRdfParse: Mediator<ActorRdfParse, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;

  /**
   * A collection of mappings, mapping file extensions to their corresponding media type.
   */
  mediaMappings: { [id: string]: string };
}
