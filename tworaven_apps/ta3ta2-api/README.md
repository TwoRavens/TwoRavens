# TA3-TA2 API

This repository contains a TA3-TA2 API protocol specification and implementation using
[GRPC](http://grpc.io/).
The API consists for the core API which constitutes a base capability that will be expanded
in the future. Currently, its aim is at satisfying the train/predict/subset tasks.
Together with core API there are optional API extensions available.

The GRPC protocol specification can be automatically compiled into implementations
for multiple programming languages.
See below for more information and the [Quickstart](http://grpc.io/docs/quickstart/) for details
about GRPC.

## About Data Driven Discovery Program

DARPA Data Driven Discovery (D3M) Program is researching ways to get machines to build
machine learning pipelines automatically. It is split into three layers:
TA1 (primitives), TA2 (systems which combine primitives automatically into pipelines
and executes them), and TA3 (end-users interfaces).

## Changelog

See [HISTORY.md](./HISTORY.md) for summary of changes to the API.

## Repository structure

`master` branch contains latest stable release of the TA3-TA2 API specification.
`devel` branch is a stagging branch for the next release.

Releases are [tagged](https://gitlab.com/datadrivendiscovery/ta3ta2-api/tags).

At every commit to `master` and `devel` branches we compile `.proto` files and push
compiled files to `dist-*` and `dev-dist-*` branches for multiple languages. You can use those
branches in your projects directly using `git submodule` or some other similar mechanism.

## API Structure

TA3-TA2 API is structured into *core* and *optional* GRPC services. Core service can be found in `core.proto`
and all TA3 and TA2 systems are expected to implement it and support it. Optional services can be found in other `.proto`
files.

## GRPC compilation

GRPC provides tooling to compile protocol specification into various target languages. Examples follow.

### Go setup

To set up GRPC and Protocol Buffers in Go run:

```
go get -u github.com/golang/protobuf/proto
go get -u github.com/golang/protobuf/protoc-gen-go
go get -u google.golang.org/grpc
```
Next install protocol buffer compiler:

Linux

```bash
curl -OL https://github.com/google/protobuf/releases/download/v3.3.0/protoc-3.3.0-linux-x86_64.zip
unzip protoc-3.3.0-linux-x86_64.zip -d protoc3
sudo cp protoc3/bin/protoc /usr/bin/protoc
sudo cp -r protoc3/include /usr/local
```

OSX

```bash
curl -OL https://github.com/google/protobuf/releases/download/v3.3.0/protoc-3.3.0-osx-x86_64.zip
unzip protoc-3.3.0-osx-x86_64.zip -d protoc3
sudo cp protoc3/bin/protoc /usr/bin/protoc
sudo cp -r protoc3/include /usr/local
```

Compile the `.proto` file:

```
protoc -I /usr/local/include -I . core.proto --go_out=plugins=grpc:.
```

The resulting `core.pb.go` file implements the messaging protocol, client and server.

### Python setup

Install libraries and tools via pip:

```
python -m pip install grpcio --ignore-installed
python -m pip install grpcio-tools
```

Compile the `.proto` file:

```
python -m grpc_tools.protoc -I . --python_out=. --grpc_python_out=. core.proto
```

The created `core_pb2.py` file implements the messaging protocol, and `core_pb2_grpc.py` implements the client and server.

### Javascript/Node.js setup

Use `npm` to get GRPC and Protocol Buffer packages:

```
npm install grpc
npm install google-protobuf
```

Just as with Go installation, need to install protocol buffer compiler:

Linux

```bash
curl -OL https://github.com/google/protobuf/releases/download/v3.3.0/protoc-3.3.0-linux-x86_64.zip
unzip protoc-3.3.0-linux-x86_64.zip -d protoc3
sudo mv protoc3/bin/protoc /usr/bin/protoc
sudo cp -r protoc3/include /usr/local
```

OSX

```bash
curl -OL https://github.com/google/protobuf/releases/download/v3.3.0/protoc-3.3.0-osx-x86_64.zip
unzip protoc-3.3.0-osx-x86_64.zip -d protoc3
sudo mv protoc3/bin/protoc /usr/bin/protoc
sudo cp -r protoc3/include /usr/local
```

Compile the `.proto` file:

```
protoc -I /usr/local/include -I . core.proto --js_out=import_style=commonjs,binary:.
```

The resulting `core_pb.js` file implements the messaging protocol, client and server.

## Dataset URIs

Many messages contain dataset URIs. Currently, only local (`file://`) URIs are supported, and they are assumed to be an
absolute path pointing to a dataset file. The following dataset types are supported:

* D3M datasets: URI should point to their `datasetDoc.json` file
* CSV datasets: URI should point to a CSV file with `.csv` file extension

URIs should be absolute to the file system, for example `file:///datasets/dataset_1/datasetDoc.json`.

Datasets are immutable: no changes should be made to files once a dataset has been created and the URI has been
exchanged between a TA3 and TA2 system.  If TA3 system modifies a dataset as part of some pre-processing step, it should
write the modified CSV or JSON files out to the file system at a new location (using the full standard D3M dataset
directory structure for D3M datasets and reference the `datasetDoc.json` file at the new location via the new URI).  If
a TA2 system modifies a dataset as part of its processing, it should leave file structure pointed to by the supplied URI
unmodified.  Predictions made by pipelines are to be returned to TA3 systems as URIs, again pointing to a
`datasetDoc.json` file that corresponds to a D3M dataset, for D3M datasets.

It is assumed that both TA2 and TA3 systems both have access to the directories for datasets, so that when one system
creates a dataset and sends over the URI, the other can directly access it without doing any extra work (like
downloading or copying). It is further assumed that both systems have directories mounted at the same location.

## Example call flows

### Basic pipeline creation

Below is an example call flow in which a TA3 system initiates a pipeline creation request, and the TA2 system returns two
pipelines through a series of streamed responses.  Responses for multiple pipelines are transmitted using a single stream and can be interleaved.

```
1. Client: StartSession(SessionRequest)
2. Server: Response
3. Client: CreatePipelines(PipelineCreateRequest)
[RESULT STREAM BEGINS]
4. Server: PipelineCreateResult // pipeline_id = 001f, progress_info = SUBMITTED
5. Server: PipelineCreateResult // pipeline_id = 001f, progress_info = RUNNING
6. Server: PipelineCreateResult // pipeline_id = A04A, progress_info = SUBMITTED
7. Server: PipelineCreateResult // pipeline_id = A04A, progress_info = RUNNING
8. Server: PipelineCreateResult // pipeline_id = A04A, progress_info = COMPLETED, pipeline_info set with results
9. Server: PipelineCreateResult // pipeline_id = 001f, progress_info = COMPLETED, pipeline_info set with results
[RESULT STREAM ENDS]
10. Client: EndSession(SessionContext)
11. Server: Response
```

### Pipeline creation with intermediate results

The following call flow shows a pipeline creation request, this time returning intermediate results that are iteratively refined.
Not all TA2 systems have to support intermediate results, but API supports them for those which do. Examples of intermediate results
are for example pipelines which train in iterations, and TA2 system can report on current internal score of the pipeline after
each iteration by sending an update.

```
1. Client: StartSession(SessionRequest)
2. Server: Response
3. Client: CreatePipelines(PipelineCreateRequest)
[RESULT STREAM BEGINS]
4. Server: PipelineCreateResult // pipeline_id = 001f, progress_info = SUBMITTED
5. Server: PipelineCreateResult // pipeline_id = 001f, progress_info = RUNNING
6. Server: PipelineCreateResult // pipeline_id = 001f, progress_info = UPDATED, pipeline_info set with intermediate results
7. Server: PipelineCreateResult // pipeline_id = 001f, progress_info = UPDATED, pipeline_info set with intermediate results
8. Server: PipelineCreateResult // pipeline_id = 001f, progress_info = COMPLETED, pipeline_info set with final results
[RESULT STREAM ENDS]
9. Client: EndSession(SessionContext)
10. Server: Response
```

### Dataset modification usage

The following calls in Go (error handling excluded) demonstrate the case where a TA3 system wishes to eliminate features `state2` and `stfips` from dataset
`26_radon_seed_dataset`, and then persist that result for future use. This uses optional API extension.

```go
res, err := client.RemoveFeatures(
    RemoveFeaturesRequest {
        Context: SessionContext {
            Session_id: "0A0ECAAF"
        },
        Dataset_Uri: "file:///mnt/datasets/26_radon_seed_dataset/datasetDoc.json",
        Features: []SingleFeature {
            SingleFeature {
                Resource_id: "0",
                Feature_name: "state2",
            },
            SingleFeature {
                Resource_id: "0",
                Feature_name: "stfips",
            },
        },
    }
)
res, err := client.Materialize(
    Context: SessionContext {
        Session_id: "0A0ECAAF"
    },
    Source_Dataset_Uri: "file:///mnt/datasets/26_radon_seed_dataset/datasetDoc.json",
    Dest_Dataset_Uri: "file:///mnt/datasets/26_radon_seed_dataset_updated/datasetDoc.json",
)
```

## Protocol version

To support easier debugging `SessionRequest` and `SessionResponse` messages contain a version of the protocol
used by each party. This can serve to easier understand a potential problem by detecting a version mismatch.

For this to work, `version` field has to be populated from the value stored in the protocol specification itself.
We use [custom options](https://developers.google.com/protocol-buffers/docs/proto#customoptions) for this.
To retrieve the version from the protocol specification, you can do the following in Python:

```python
import pipeline_service_pb2
version = pipeline_service_pb2.DESCRIPTOR.GetOptions().Extensions[pipeline_service_pb2.protocol_version]
```

In Go, accessing version is slightly more involved and it is described
[here](https://gitlab.com/datadrivendiscovery/ta3ta2-api/snippets/1684616).

## Extensions of messages

GRPC and Protocol Buffers support a simple method of extending messages: just define extra fields with custom tags
in your local version of the protocol. Performers can do that to experiment with variations of the protocol (and if
changes work out, they can submit a merge request to the common API). To make sure such unofficial fields in messages
do not conflict between performers, use values from the [allocated tag ranges](./private_tag_ranges.txt) for your
organization.

## Contributing

See [contributing guide](./CONTRIBUTING.md) for more information how to contribute to the API development.
