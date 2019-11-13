
report.app <- function(data) {
  print('entering report app')

  requirePackages(c(packageList.any, packageList.report.app))

  if (!dir.exists(REPORT_OUTPUT_PATH))
  dir.create(REPORT_OUTPUT_PATH, recursive = TRUE)

  reportName <- paste0('report_', paste0(sample(c(0:9, LETTERS), 10, replace=TRUE), collapse=""), '.pdf')

  templatePath <- paste(getwd(), 'apps/appReportTemplate.Rmd', sep="/")
  releasePath <- paste(REPORT_OUTPUT_PATH, 'preprocess.json', sep="/")
  reportPath <- paste(REPORT_OUTPUT_PATH, reportName, sep="/")

  reportParams <- list(
    title="Dataset Summary",
    author="TwoRavens",
    path=releasePath
  )

  write(data$metadata, releasePath)
  rmarkdown::render(
    templatePath,
    params=reportParams,
    output_file=reportPath,
    envir = new.env() # knit in a new R session, to prevent name collisions
  )

  file.remove(releasePath)

  jsonlite::toJSON(list(report_url=jsonlite::unbox(reportPath)))
}

