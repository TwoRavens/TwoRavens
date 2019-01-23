This version of TwoRavens is used to subset and aggregate event data. Events are classified by their time, location, actors, and actions. We currently offer twelve datasets with event data; however, some of these datasets lack one of the aforementioned categories of data. Below we list changes, standardizations, and constructions we have made to the datasets to allow cross-dataset analysis.

## Subsets
Event data datasets generally classify events by date, location, actors, and actions. If a dataset is missing one of these categories, it is not included in the menus for subsetting. All edits to datasets are prefixed with "TwoRavens_" with the exception of actors; this allows users to download the dataset and drop all columns prefixed with "TwoRavens_" to restore the original dataset.

### Date
We standardize date fields to a timestamp. All dates fields are converted and prefixed with "TwoRavens_". The three important fields used in EventData are: "TwoRavens_start date", "TwoRavens_end date", and "TwoRavens_date info". "TwoRavens_start date" and "TwoRavens_end date" correspond to the start and end of the event; all times are aligned to midnight of each date. "TwoRavens_date info" is used to represent the accuracy of the start and end date; a "0" represents an exact start and end date, a "1" represents the exact day is missing, a "2" represents the exact month is missing, and a "3" represents both the day and month are missing. Missing dates are aligned to the earliest date available: a missing day will be aligned to the first day of that month, and a missing month will be aligned to the first day of that year.

### Location
We standardize location fields to two fields: "TwoRavens_country" and "TwoRavens_country_historic". The former is using the ISO-3 standard to represent the modern day country; the latter is using the Correlates of War (COW) standard to represent the historical state of the event. For datasets using alternate country codes, we use a translation table to convert to COW codes. If an alternate code is not in the original COW code list or if the COW code is referring to a modern-day region, we have created a substitute (historical regions and states are discussed further below). We try to pick substitute codes that are close to their counterpart. The following is a list of substitutes:

#### Substitute ISO-3
| StateName COW | COWcode | ISO-3 | UN M.49 | Notes |                                      |
|---------------|---------|-------|---------|-------|--------------------------------------|
| Yugoslavia    | YUG     | 345   | MNE     | 499   | defaulted to Montenegro              |
| Kosovo        | KOS     | 347   | XKX     | 412   | is listed as an alternate ISO-3 code |

#### Substitute COW
| StateName                                    | COW | COWcode | ISO-3 | Notes                                                                  |
|----------------------------------------------|-----|---------|-------|------------------------------------------------------------------------|
| Puerto Rico                                  | PRI | 3       | PRI   | US territory                                                           |
| Virgin Island, US                            | VIR | 4       | VIR   | US territory                                                           |
| American Samoa                               | ASM | 5       | ASM   | US territory                                                           |
| Guam                                         | GUM | 6       | GUM   | US territory                                                           |
| Northern Mariana Islands                     | MNP | 7       | MNP   | US Commonwealth                                                        |
| United States Minor Outlying Islands         | UMI | 8       | UMI   | US territories                                                         |
| Jersey                                       | JEY | 203     | JEY   | self-governing British dependency                                      |
| Isle of Man                                  | IMN | 202     | IMN   | self-governing British dependency                                      |
| Guernsey                                     | GGY | 201     | GGY   | island in English Channel                                              |
| Saint Helena                                 | SHN | 199     | SHN   | British Overseas Territories (BOTs)                                    |
| Bermuda                                      | BMU | 198     | BMU   | BOTs                                                                   |
| Falkland Islands                             | FLK | 197     | FLK   | BOTs                                                                   |
| South Georgia and the South Sandwich Islands | SGS | 196     | SGS   | BOTs                                                                   |
| British Indian Ocean Territory               | IOT | 195     | IOT   | BOTs                                                                   |
| Anguilla                                     | AIA | 194     | AIA   | BOTs                                                                   |
| Cayman Islands                               | CYM | 193     | CYM   | BOTs                                                                   |
| Montserrat                                   | MSR | 192     | MSR   | BOTs                                                                   |
| Turks and Caicos Islands                     | TCA | 191     | TCA   | BOTs                                                                   |
| Virgin Island, British                       | VGB | 190     | VGB   | BOTs                                                                   |
| Gibraltar                                    | GIB | 189     | GIB   | BOTs                                                                   |
| Pitcairn                                     | PCN | 188     | PCN   | BOTs                                                                   |
| Netherlands Antilles                         | ANT | 209     | ANT   | former country of the Netherlands                                      |
| Aruba                                        | ABW | 207     | ABW   | country of the Netherlands                                             |
| Mayotte                                      | MYT | 219     | MYT   | overseas region of France                                              |
| Reunion                                      | REU | 218     | REU   | overseas region of France                                              |
| Saint Pierre and Miquelon                    | SPM | 217     | SPM   | French territory                                                       |
| French Guiana                                | GUF | 216     | GUF   | overseas region of France                                              |
| Saint Barthelemy                             | BLM | 215     | BLM   | French territory                                                       |
| Saint Martin (French part)                   | MAF | 214     | MAF   | overseas region of France                                              |
| New Caledonia                                | NCL | 213     | NCL   | overseas region of France                                              |
| Guadeloupe                                   | GLP | 170     | GLP   | overseas region of France                                              |
| Martinique                                   | MTQ | 171     | MTQ   | overseas region of France                                              |
| French Polynesia                             | PYF | 172     | PYF   | overseas region of France                                              |
| Wallis and Futuna                            | WLF | 173     | WLF   | overseas region of France                                              |
| French Southern Territories                  | ATF | 174     | ATF   | overseas region of France                                              |
| Holy See                                     | VAT | 324     | VAT   | Vatican City State                                                     |
| Serbia                                       | SRB | 342     | SRB   | parted from Serbia and Montenegro                                      |
| Aland Islands                                | ALA | 374     | ALA   | region of Finland                                                      |
| Bouvet Island                                | BVT | 384     | BVT   | dependency of Norway                                                   |
| Svalbard and Jan Mayen                       | SJM | 383     | SJM   | island of Norway                                                       |
| Greenland                                    | GRL | 389     | GRL   | autonomous Danish (Denmark) territory                                  |
| Faroe Islands                                | FRO | 388     | FRO   | autonomous country of Denmark                                          |
| People's Republic of the Congo               | PRC | 485     | COG   | socialist state that was eventually replaced by Congo (Republic of)    |
| Zanzibar                                     | TAZ | 511     | TZA   | semi-autonomous region of Tanzania                                     |
| Western Sahara                               | ESH | 599     | ESH   | disputed territory by Morocco                                          |
| Palestinian Territory                        | PSE | 665     | PSE   | occupied by Israel                                                     |
| Hong Kong                                    | HKG | 709     | HKG   | former British territory, Special Administrative Region (SAR) of China |
| Macao                                        | MCA | 708     | MAC   | SAR of China                                                           |
| Cocos Islands                                | CCK | 899     | CCK   | territory of Australia                                                 |
| Christmas Island                             | CXR | 898     | CXR   | territory of Australia                                                 |
| Norfolk Island                               | NFK | 897     | NFK   | territory of Australia                                                 |
| Heard Island and McDonald Islands            | HMD | 896     | HMD   | territory of Australia                                                 |
| Cook Islands                                 | COK | 919     | COK   | island associated with New Zealand                                     |
| Niue                                         | NIU | 918     | NIU   | island associated with New Zealand                                     |
| Tokelau                                      | TKL | 917     | TKL   | dependent territory of New Zealand                                     |
| Antartica                                    | ATA | 999     | ATA   | multiple territories                                                   |

#### New ISO-3 and COW
| StateName    | COW | COWCode | ISO-3 | UN M.49 | Notes                                               |
|--------------|-----|---------|-------|---------|-----------------------------------------------------|
| Curaçao      | CUW | 208     | CUW   | 530     | country from Netherlands Antilles after dissolution |
| Sint Maarten | SXM | 206     | SXM   | 664     | constituent country of Netherlands                  |

#### Dissolved states
For States that do not exist anymore, we store their date of dissolution as part of the translation table. This allows for greater detail when subsetting by date and location. The ISO-3 code is the modern day state name, whereas the COW code is the state name at the time of the event. The following is a list of countries that fall under this category:

| StateName                      | COW | ISO-3 | DateofDissolution                  | Notes                                                                     |
|--------------------------------|-----|-------|------------------------------------|---------------------------------------------------------------------------|
| Hanover                        | HAN | DEU   | August 23, 1866                    | Austro-Prussian War                                                       |
| Bavaria                        | BAV | DEU   | November 11, 1918                  | WW1                                                                       |
| German Federal Republic        | GFR | DEU   | October 3, 1990                    | German reunification                                                      |
| German Democratic Republic     | GDR | DEU   | October 3, 1990                    | German reunification                                                      |
| Baden                          | BAD | DEU   | September 2, 1945                  | WW2                                                                       |
| Saxony                         | SAX | DEU   | November 11, 1918                  | WW1                                                                       |
| Wuerttemburg                   | WRT | DEU   | November 11, 1918                  | WW1                                                                       |
| Hesse Electoral                | HSE | DEU   | August 23, 1866                    | Austro-Prussian War                                                       |
| Hesse Grand Ducal              | HSG | DEU   | November 11, 1918                  | WW1                                                                       |
| Mecklenburg Schwerin           | MEC | DEU   | November 11, 1918                  | WW1                                                                       |
| Austria-Hungary                | AUH | AUT   | November 11, 1918                  | WW1                                                                       |
| Czechoslovakia                 | CZE | CZE   | January 1, 1993                    | CZE (COW) is for Czechoslovakia; CZE (ISO-3) is for Czech Republic        |
| Papal States                   | PAP | ITA   | September 20, 1870                 | Capture of Rome                                                           |
| Two Sicilies                   | SIC | ITA   | March 17, 1861                     | Declaration of Unification                                                |
| Modena                         | MOD | ITA   | December 3, 1859                   | Italian Unification                                                       |
| Parma                          | PMA | ITA   | December 3, 1859                   | Italian Unification                                                       |
| Tuscany                        | TUS | ITA   | December 8, 1859                   | Italian Unification                                                       |
| Yugoslavia                     | YUG | MNE   | June 3, 2006                       | split into Serbia and Montenegro; defaulted to Montenegro (MNE)           |
| Yemen Arab Republic            | YAR | YEM   | May 22, 1990                       | Yemeni unification                                                        |
| Yemen People's Republic        | YPR | YEM   | May 22, 1990                       | Yemeni unification                                                        |
| Korea                          | KOR | KOR   | July 27, 1953                      | Korean War; defaulted to South Korea (KOR)                                |
| Republic of Vietnam            | RVN | VNM   | July 2, 1976                       | Reunification of Vietnam; RVN is South Vietnam; DRV is modern day Vietnam |
| Netherlands Antilles           | ANT | ANT   | October 10, 2010                   | Disestablishment of Netherlands Antilles                                  |
| People's Republic of the Congo | PRC | COG   | January 31, 1969-December 31, 1992 | socialist state that was eventually replaced by Congo (Republic of)       |

#### Notes and other standardizations
Note that the Soviet Union and the resulting Commonwealth of Independent States are not in COW; they are mapped to Russia (RUS).

For other standardizations (Gleditsch and Ward number (GW codes) and GTD currently), I have mapped them to the COW codes. If there are codes in these standardizations that are not in COW and are not in the datasets themselves, I have not included them (to do later).

#### Process
The standardization process begins with extracting the field in the dataset with location information. If coordinate data is present, this is used to reverse geolocate the following fields: "TwoRavens_address", "TwoRavens_city", "TwoRavens_country", "TwoRavens_postal", "TwoRavens_postal_ext", "TwoRavens_region", "TwoRavens_subregion". If a physical location name is present, this is used to geolocate the previous fields. Only "TwoRavens_country" is used in EventData; this is in ISO-3 format. We then map the ISO-3 code with the event date to COW to fill the "TwoRavens_country_historic" field.

The full table of alignments can be found in [here](../tworaven_apps/eventdata_queries/alignments/country_cow_aligned.json). All references below refer to the column names in the JSON file.

Below is a list of the corresponding fields of datasets that have been standardized:
- acled_africa: field is "ISO", in UN M.49 format
- acled_asia: field is "ISO", in UN M.49 format
- acled_middle_east: field is "ISO", in UN M.49 format
- cline_phoenix_fbis: field is "countryname", in ISO-3 format; may have empty fields
- cline_phoenix_nyt: field is "countryname", in ISO-3 format; may have empty fields
- cline_phoenix_swb: field is "countryname", in ISO-3 format; may have empty fields
- cline_speed: field is "GP7", "GP8" (coordinate data); may have empty TwoRavens_country fields
- ged: field is "country_id", in GW format
- gtd: field is "country", in GTD format
- icews: field is "Country", in ICEWS format
- terrier: field is "country_code", in ISO-2 format

#### Coordinate data
If longitude and latitude data are present, a subset option called "Coordinates" is available for regional subsetting.

### Actors
We typically use the dataset's classification schema of actors. Actor data is represented as a source agent and a target agent. If no actor data is present, the subset menu for actors is not shown. If the dataset uses countries as actors, then we offer two versions of actors to subset on: modern or historic country codes (see Locations for more information). The modern codes are under "TwoRavens_country_src" and "TwoRavens_country_tgt", and the historic codes are under "TwoRavens_country_historic_src" and "TwoRavens_country_historic_tgt".

If the dataset stores actors in a list, these are parsed and each combination of actors is split into an individual event. For example, if a dataset has the source actors as [ctryA, ctryB] and the target actors as [ctryC, ctryD], then four events would replace the original: ctryA to ctryC, ctryA to ctryD, ctryB to ctryC, and ctryB to ctryD.

### Actions
The dataset's classification schema of actors is used. If a conversion can be made to another format, then the option to subset on these different formats is made available. Below is a list of formats that we currently support conversions between:
- CAMEO
- CAMEO root code (first two digits of the CAMEO code)
- Phoenix penta class (see [here](https://s3.amazonaws.com/oeda/docs/phoenix_codebook.pdf) for conversion)
- PLOVER
