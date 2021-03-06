# Two Ravens: Event Data

###  
<section>
        <article><p>This version of TwoRavens is used to subset and aggregate event data. Events are classified by their time, location, actors, and actions. We currently offer twelve datasets with event data; however, some of these datasets lack one of the aforementioned categories of data. Below we list changes, standardizations, and constructions we have made to the datasets to allow cross-dataset analysis.</p>
<h2>Subsets</h2>
<p>Event data datasets generally classify events by date, location, actors, and actions. If a dataset is missing one of these categories, it is not included in the menus for subsetting. All edits to datasets are prefixed with "TwoRavens_" with the exception of actors; this allows users to download the dataset and drop all columns prefixed with "TwoRavens_" to restore the original dataset.</p>
<h3>Date</h3>
<p>We standardize date fields to a timestamp. All dates fields are converted and prefixed with "TwoRavens_". The three important fields used in EventData are: "TwoRavens_start date", "TwoRavens_end date", and "TwoRavens_date info". "TwoRavens_start date" and "TwoRavens_end date" correspond to the start and end of the event; all times are aligned to midnight of each date. "TwoRavens_date info" is used to represent the accuracy of the start and end date; a "0" represents an exact start and end date, a "1" represents the exact day is missing, a "2" represents the exact month is missing, and a "3" represents both the day and month are missing. Missing dates are aligned to the earliest date available: a missing day will be aligned to the first day of that month, and a missing month will be aligned to the first day of that year.</p>
<h3>Location</h3>
<p>We standardize location fields to two fields: "TwoRavens_country" and "TwoRavens_country_historic". The former is using the ISO-3 standard to represent the modern day country; the latter is using the Correlates of War (COW) standard to represent the historical state of the event. For datasets using alternate country codes, we use a translation table to convert to COW codes. If an alternate code is not in the original COW code list or if the COW code is referring to a modern-day region, we have created a substitute (historical regions and states are discussed further below). We try to pick substitute codes that are close to their counterpart. The following is a list of substitutes:</p>
<h4>Substitute ISO-3</h4>
<table>
<thead>
<tr>
<th>StateName COW</th>
<th>COWcode</th>
<th>ISO-3</th>
<th>UN M.49</th>
<th>Notes</th>
<th></th>
</tr>
</thead>
<tbody>
<tr>
<td>Yugoslavia</td>
<td>YUG</td>
<td>345</td>
<td>MNE</td>
<td>499</td>
<td>defaulted to Montenegro</td>
</tr>
<tr>
<td>Kosovo</td>
<td>KOS</td>
<td>347</td>
<td>XKX</td>
<td>412</td>
<td>is listed as an alternate ISO-3 code</td>
</tr>
</tbody>
</table>
<h4>Substitute COW</h4>
<table>
<thead>
<tr>
<th>StateName</th>
<th>COW</th>
<th>COWcode</th>
<th>ISO-3</th>
<th>Notes</th>
</tr>
</thead>
<tbody>
<tr>
<td>Puerto Rico</td>
<td>PRI</td>
<td>3</td>
<td>PRI</td>
<td>US territory</td>
</tr>
<tr>
<td>Virgin Island, US</td>
<td>VIR</td>
<td>4</td>
<td>VIR</td>
<td>US territory</td>
</tr>
<tr>
<td>American Samoa</td>
<td>ASM</td>
<td>5</td>
<td>ASM</td>
<td>US territory</td>
</tr>
<tr>
<td>Guam</td>
<td>GUM</td>
<td>6</td>
<td>GUM</td>
<td>US territory</td>
</tr>
<tr>
<td>Northern Mariana Islands</td>
<td>MNP</td>
<td>7</td>
<td>MNP</td>
<td>US Commonwealth</td>
</tr>
<tr>
<td>United States Minor Outlying Islands</td>
<td>UMI</td>
<td>8</td>
<td>UMI</td>
<td>US territories</td>
</tr>
<tr>
<td>Jersey</td>
<td>JEY</td>
<td>203</td>
<td>JEY</td>
<td>self-governing British dependency</td>
</tr>
<tr>
<td>Isle of Man</td>
<td>IMN</td>
<td>202</td>
<td>IMN</td>
<td>self-governing British dependency</td>
</tr>
<tr>
<td>Guernsey</td>
<td>GGY</td>
<td>201</td>
<td>GGY</td>
<td>island in English Channel</td>
</tr>
<tr>
<td>Saint Helena</td>
<td>SHN</td>
<td>199</td>
<td>SHN</td>
<td>British Overseas Territories (BOTs)</td>
</tr>
<tr>
<td>Bermuda</td>
<td>BMU</td>
<td>198</td>
<td>BMU</td>
<td>BOTs</td>
</tr>
<tr>
<td>Falkland Islands</td>
<td>FLK</td>
<td>197</td>
<td>FLK</td>
<td>BOTs</td>
</tr>
<tr>
<td>South Georgia and the South Sandwich Islands</td>
<td>SGS</td>
<td>196</td>
<td>SGS</td>
<td>BOTs</td>
</tr>
<tr>
<td>British Indian Ocean Territory</td>
<td>IOT</td>
<td>195</td>
<td>IOT</td>
<td>BOTs</td>
</tr>
<tr>
<td>Anguilla</td>
<td>AIA</td>
<td>194</td>
<td>AIA</td>
<td>BOTs</td>
</tr>
<tr>
<td>Cayman Islands</td>
<td>CYM</td>
<td>193</td>
<td>CYM</td>
<td>BOTs</td>
</tr>
<tr>
<td>Montserrat</td>
<td>MSR</td>
<td>192</td>
<td>MSR</td>
<td>BOTs</td>
</tr>
<tr>
<td>Turks and Caicos Islands</td>
<td>TCA</td>
<td>191</td>
<td>TCA</td>
<td>BOTs</td>
</tr>
<tr>
<td>Virgin Island, British</td>
<td>VGB</td>
<td>190</td>
<td>VGB</td>
<td>BOTs</td>
</tr>
<tr>
<td>Gibraltar</td>
<td>GIB</td>
<td>189</td>
<td>GIB</td>
<td>BOTs</td>
</tr>
<tr>
<td>Pitcairn</td>
<td>PCN</td>
<td>188</td>
<td>PCN</td>
<td>BOTs</td>
</tr>
<tr>
<td>Netherlands Antilles</td>
<td>ANT</td>
<td>209</td>
<td>ANT</td>
<td>former country of the Netherlands</td>
</tr>
<tr>
<td>Aruba</td>
<td>ABW</td>
<td>207</td>
<td>ABW</td>
<td>country of the Netherlands</td>
</tr>
<tr>
<td>Mayotte</td>
<td>MYT</td>
<td>219</td>
<td>MYT</td>
<td>overseas region of France</td>
</tr>
<tr>
<td>Reunion</td>
<td>REU</td>
<td>218</td>
<td>REU</td>
<td>overseas region of France</td>
</tr>
<tr>
<td>Saint Pierre and Miquelon</td>
<td>SPM</td>
<td>217</td>
<td>SPM</td>
<td>French territory</td>
</tr>
<tr>
<td>French Guiana</td>
<td>GUF</td>
<td>216</td>
<td>GUF</td>
<td>overseas region of France</td>
</tr>
<tr>
<td>Saint Barthelemy</td>
<td>BLM</td>
<td>215</td>
<td>BLM</td>
<td>French territory</td>
</tr>
<tr>
<td>Saint Martin (French part)</td>
<td>MAF</td>
<td>214</td>
<td>MAF</td>
<td>overseas region of France</td>
</tr>
<tr>
<td>New Caledonia</td>
<td>NCL</td>
<td>213</td>
<td>NCL</td>
<td>overseas region of France</td>
</tr>
<tr>
<td>Guadeloupe</td>
<td>GLP</td>
<td>170</td>
<td>GLP</td>
<td>overseas region of France</td>
</tr>
<tr>
<td>Martinique</td>
<td>MTQ</td>
<td>171</td>
<td>MTQ</td>
<td>overseas region of France</td>
</tr>
<tr>
<td>French Polynesia</td>
<td>PYF</td>
<td>172</td>
<td>PYF</td>
<td>overseas region of France</td>
</tr>
<tr>
<td>Wallis and Futuna</td>
<td>WLF</td>
<td>173</td>
<td>WLF</td>
<td>overseas region of France</td>
</tr>
<tr>
<td>French Southern Territories</td>
<td>ATF</td>
<td>174</td>
<td>ATF</td>
<td>overseas region of France</td>
</tr>
<tr>
<td>Holy See</td>
<td>VAT</td>
<td>324</td>
<td>VAT</td>
<td>Vatican City State</td>
</tr>
<tr>
<td>Serbia</td>
<td>SRB</td>
<td>342</td>
<td>SRB</td>
<td>parted from Serbia and Montenegro</td>
</tr>
<tr>
<td>Aland Islands</td>
<td>ALA</td>
<td>374</td>
<td>ALA</td>
<td>region of Finland</td>
</tr>
<tr>
<td>Bouvet Island</td>
<td>BVT</td>
<td>384</td>
<td>BVT</td>
<td>dependency of Norway</td>
</tr>
<tr>
<td>Svalbard and Jan Mayen</td>
<td>SJM</td>
<td>383</td>
<td>SJM</td>
<td>island of Norway</td>
</tr>
<tr>
<td>Greenland</td>
<td>GRL</td>
<td>389</td>
<td>GRL</td>
<td>autonomous Danish (Denmark) territory</td>
</tr>
<tr>
<td>Faroe Islands</td>
<td>FRO</td>
<td>388</td>
<td>FRO</td>
<td>autonomous country of Denmark</td>
</tr>
<tr>
<td>People's Republic of the Congo</td>
<td>PRC</td>
<td>485</td>
<td>COG</td>
<td>socialist state that was eventually replaced by Congo (Republic of)</td>
</tr>
<tr>
<td>Zanzibar</td>
<td>TAZ</td>
<td>511</td>
<td>TZA</td>
<td>semi-autonomous region of Tanzania</td>
</tr>
<tr>
<td>Western Sahara</td>
<td>ESH</td>
<td>599</td>
<td>ESH</td>
<td>disputed territory by Morocco</td>
</tr>
<tr>
<td>Palestinian Territory</td>
<td>PSE</td>
<td>665</td>
<td>PSE</td>
<td>occupied by Israel</td>
</tr>
<tr>
<td>Hong Kong</td>
<td>HKG</td>
<td>709</td>
<td>HKG</td>
<td>former British territory, Special Administrative Region (SAR) of China</td>
</tr>
<tr>
<td>Macao</td>
<td>MCA</td>
<td>708</td>
<td>MAC</td>
<td>SAR of China</td>
</tr>
<tr>
<td>Cocos Islands</td>
<td>CCK</td>
<td>899</td>
<td>CCK</td>
<td>territory of Australia</td>
</tr>
<tr>
<td>Christmas Island</td>
<td>CXR</td>
<td>898</td>
<td>CXR</td>
<td>territory of Australia</td>
</tr>
<tr>
<td>Norfolk Island</td>
<td>NFK</td>
<td>897</td>
<td>NFK</td>
<td>territory of Australia</td>
</tr>
<tr>
<td>Heard Island and McDonald Islands</td>
<td>HMD</td>
<td>896</td>
<td>HMD</td>
<td>territory of Australia</td>
</tr>
<tr>
<td>Cook Islands</td>
<td>COK</td>
<td>919</td>
<td>COK</td>
<td>island associated with New Zealand</td>
</tr>
<tr>
<td>Niue</td>
<td>NIU</td>
<td>918</td>
<td>NIU</td>
<td>island associated with New Zealand</td>
</tr>
<tr>
<td>Tokelau</td>
<td>TKL</td>
<td>917</td>
<td>TKL</td>
<td>dependent territory of New Zealand</td>
</tr>
<tr>
<td>Antartica</td>
<td>ATA</td>
<td>999</td>
<td>ATA</td>
<td>multiple territories</td>
</tr>
</tbody>
</table>
<h4>New ISO-3 and COW</h4>
<table>
<thead>
<tr>
<th>StateName</th>
<th>COW</th>
<th>COWCode</th>
<th>ISO-3</th>
<th>UN M.49</th>
<th>Notes</th>
</tr>
</thead>
<tbody>
<tr>
<td>Curaçao</td>
<td>CUW</td>
<td>208</td>
<td>CUW</td>
<td>530</td>
<td>country from Netherlands Antilles after dissolution</td>
</tr>
<tr>
<td>Sint Maarten</td>
<td>SXM</td>
<td>206</td>
<td>SXM</td>
<td>664</td>
<td>constituent country of Netherlands</td>
</tr>
<tr>
<td>Corsica</td>
<td>CRS</td>
<td>175</td>
<td>CRS</td>
<td>---</td>
<td>French Mediterranean island; added as part of GTD</td>
</tr>
<tr>
<td>International</td>
<td>III</td>
<td>1</td>
<td>III</td>
<td>1</td>
<td>international group of countries; added as part of GTD</td>
</tr>
<tr>
<td>Multinational</td>
<td>MTN</td>
<td>0</td>
<td>MTN</td>
<td>0</td>
<td>multinational group of countries; added as part of GTD</td>
</tr>
<tr>
<td>Asian</td>
<td>ASN</td>
<td>1000</td>
<td>ASN</td>
<td>---</td>
<td>group of countries in Asia; added as part of GTD</td>
</tr>
</tbody>
</table>
<h4>Dissolved states</h4>
<p>For States that do not exist anymore, we store their date of dissolution as part of the translation table. This allows for greater detail when subsetting by date and location. The ISO-3 code is the modern day state name, whereas the COW code is the state name at the time of the event. The following is a list of countries that fall under this category:</p>
<table>
<thead>
<tr>
<th>StateName</th>
<th>COW</th>
<th>ISO-3</th>
<th>DateofDissolution</th>
<th>Notes</th>
</tr>
</thead>
<tbody>
<tr>
<td>Hanover</td>
<td>HAN</td>
<td>DEU</td>
<td>August 23, 1866</td>
<td>Austro-Prussian War</td>
</tr>
<tr>
<td>Bavaria</td>
<td>BAV</td>
<td>DEU</td>
<td>November 11, 1918</td>
<td>WW1</td>
</tr>
<tr>
<td>German Federal Republic</td>
<td>GFR</td>
<td>DEU</td>
<td>October 3, 1990</td>
<td>German reunification</td>
</tr>
<tr>
<td>German Democratic Republic</td>
<td>GDR</td>
<td>DEU</td>
<td>October 3, 1990</td>
<td>German reunification</td>
</tr>
<tr>
<td>Baden</td>
<td>BAD</td>
<td>DEU</td>
<td>September 2, 1945</td>
<td>WW2</td>
</tr>
<tr>
<td>Saxony</td>
<td>SAX</td>
<td>DEU</td>
<td>November 11, 1918</td>
<td>WW1</td>
</tr>
<tr>
<td>Wuerttemburg</td>
<td>WRT</td>
<td>DEU</td>
<td>November 11, 1918</td>
<td>WW1</td>
</tr>
<tr>
<td>Hesse Electoral</td>
<td>HSE</td>
<td>DEU</td>
<td>August 23, 1866</td>
<td>Austro-Prussian War</td>
</tr>
<tr>
<td>Hesse Grand Ducal</td>
<td>HSG</td>
<td>DEU</td>
<td>November 11, 1918</td>
<td>WW1</td>
</tr>
<tr>
<td>Mecklenburg Schwerin</td>
<td>MEC</td>
<td>DEU</td>
<td>November 11, 1918</td>
<td>WW1</td>
</tr>
<tr>
<td>Austria-Hungary</td>
<td>AUH</td>
<td>AUT</td>
<td>November 11, 1918</td>
<td>WW1</td>
</tr>
<tr>
<td>Czechoslovakia</td>
<td>CZE</td>
<td>CZE</td>
<td>January 1, 1993</td>
<td>CZE (COW) is for Czechoslovakia; CZE (ISO-3) is for Czech Republic</td>
</tr>
<tr>
<td>Papal States</td>
<td>PAP</td>
<td>ITA</td>
<td>September 20, 1870</td>
<td>Capture of Rome</td>
</tr>
<tr>
<td>Two Sicilies</td>
<td>SIC</td>
<td>ITA</td>
<td>March 17, 1861</td>
<td>Declaration of Unification</td>
</tr>
<tr>
<td>Modena</td>
<td>MOD</td>
<td>ITA</td>
<td>December 3, 1859</td>
<td>Italian Unification</td>
</tr>
<tr>
<td>Parma</td>
<td>PMA</td>
<td>ITA</td>
<td>December 3, 1859</td>
<td>Italian Unification</td>
</tr>
<tr>
<td>Tuscany</td>
<td>TUS</td>
<td>ITA</td>
<td>December 8, 1859</td>
<td>Italian Unification</td>
</tr>
<tr>
<td>Yugoslavia</td>
<td>YUG</td>
<td>MNE</td>
<td>June 3, 2006</td>
<td>split into Serbia and Montenegro; defaulted to Montenegro (MNE)</td>
</tr>
<tr>
<td>Yemen Arab Republic</td>
<td>YAR</td>
<td>YEM</td>
<td>May 22, 1990</td>
<td>Yemeni unification</td>
</tr>
<tr>
<td>Yemen People's Republic</td>
<td>YPR</td>
<td>YEM</td>
<td>May 22, 1990</td>
<td>Yemeni unification</td>
</tr>
<tr>
<td>Korea</td>
<td>KOR</td>
<td>KOR</td>
<td>July 27, 1953</td>
<td>Korean War; defaulted to South Korea (KOR)</td>
</tr>
<tr>
<td>Republic of Vietnam</td>
<td>RVN</td>
<td>VNM</td>
<td>July 2, 1976</td>
<td>Reunification of Vietnam; RVN is South Vietnam; DRV is modern day Vietnam</td>
</tr>
<tr>
<td>Netherlands Antilles</td>
<td>ANT</td>
<td>ANT</td>
<td>October 10, 2010</td>
<td>Disestablishment of Netherlands Antilles</td>
</tr>
<tr>
<td>People's Republic of the Congo</td>
<td>PRC</td>
<td>COG</td>
<td>January 31, 1969-December 31, 1992</td>
<td>socialist state that was eventually replaced by Congo (Republic of)</td>
</tr>
</tbody>
</table>
<h4>Notes and other standardizations</h4>
<p>Note that the Soviet Union and the resulting Commonwealth of Independent States are not in COW; they are mapped to Russia (RUS).</p>
<p>For other standardizations (Gleditsch and Ward number (GW codes) and GTD currently), I have mapped them to the COW codes. If there are codes in these standardizations that are not in COW and are not in the datasets themselves, I have not included them (to do later).</p>
<h4>Process</h4>
<p>The standardization process begins with extracting the field in the dataset with location information. If coordinate data is present, this is used to reverse geolocate the following fields: "TwoRavens_address", "TwoRavens_city", "TwoRavens_country", "TwoRavens_postal", "TwoRavens_postal_ext", "TwoRavens_region", "TwoRavens_subregion". If a physical location name is present, this is used to geolocate the previous fields. Only "TwoRavens_country" is used in EventData; this is in ISO-3 format. We then map the ISO-3 code with the event date to COW to fill the "TwoRavens_country_historic" field.</p>
<p>The full table of alignments can be found in <a href="../tworaven_apps/eventdata_queries/alignments/country_cow_aligned.json">here</a>. All references below refer to the column names in the JSON file.</p>
<p>Below is a list of the corresponding fields of datasets that have been standardized:</p>
<ul>
<li>acled_africa: field is "ISO", in UN M.49 format</li>
<li>acled_asia: field is "ISO", in UN M.49 format</li>
<li>acled_middle_east: field is "ISO", in UN M.49 format</li>
<li>cline_phoenix_fbis: field is "countryname", in ISO-3 format; may have empty fields</li>
<li>cline_phoenix_nyt: field is "countryname", in ISO-3 format; may have empty fields</li>
<li>cline_phoenix_swb: field is "countryname", in ISO-3 format; may have empty fields</li>
<li>cline_speed: field is "GP7", "GP8" (coordinate data); may have empty TwoRavens_country fields</li>
<li>ged: field is "country_id", in GW format</li>
<li>gtd: field is "country", in GTD format</li>
<li>icews: field is "Country", in ICEWS format</li>
<li>terrier: field is "country_code", in ISO-2 format</li>
</ul>
<h4>Coordinate data</h4>
<p>If longitude and latitude data are present, a subset option called "Coordinates" is available for regional subsetting.</p>
<h3>Actors</h3>
<p>We typically use the dataset's classification schema of actors. Actor data is represented as a source agent and a target agent. If no actor data is present, the subset menu for actors is not shown. If the dataset uses countries as actors, then we offer two versions of actors to subset on: modern or historic country codes (see Locations for more information). The modern codes are under "TwoRavens_country_src" and "TwoRavens_country_tgt", and the historic codes are under "TwoRavens_country_historic_src" and "TwoRavens_country_historic_tgt".</p>
<p>If the dataset stores actors in a list, these are parsed and each combination of actors is split into an individual event. For example, if a dataset has the source actors as [ctryA, ctryB] and the target actors as [ctryC, ctryD], then four events would replace the original: ctryA to ctryC, ctryA to ctryD, ctryB to ctryC, and ctryB to ctryD.</p>
<h3>Actions</h3>
<p>The dataset's classification schema of actors is used. If a conversion can be made to another format, then the option to subset on these different formats is made available. Below is a list of formats that we currently support conversions between:</p>
<ul>
<li>CAMEO</li>
<li>CAMEO root code (first two digits of the CAMEO code)</li>
<li>Phoenix penta class (see <a href="https://s3.amazonaws.com/oeda/docs/phoenix_codebook.pdf">here</a> for conversion)</li>
<li>PLOVER</li>
</ul></article>
    </section>
<nav>
    <h2><a href="../..//index.html">Home</a></h2>
<h2><a href="index.html">Event Data</a></h2>
<h2><a href="../../doc_out/D3M_out/index.html">D3M</a></h2>
<h2><a href="../../doc_out/metadata_service_out/index.html">Metadata Service</a></h2>
<h2><a href="../../doc_out/arch_docs_out/index.html">Architecture</a></h2>
</nav>  
<footer>
    Documentation generated by <a href="https://github.com/jsdoc3/jsdoc">JSDoc 3.5.5</a> on Thu Feb 07 2019 16:38:08 GMT-0600 (CST)
</footer><script> prettyPrint(); </script><script src="scripts/linenumber.js"> </script>
