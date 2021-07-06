import axios, { AxiosPromise, AxiosResponse } from 'axios';
import { Request, Response } from "express";
import moment from 'moment';
import { Issue } from '../models/Issue';
import { ProjectDetails } from '../models/ProjectDetails';
const { zonedTimeToUtc } = require('date-fns-tz')

class DeveloperController {
  async worklogSearch(request: Request, response: Response) {

    const { worklogInitial, worklogEnd, worklogAuthor, project } = request.body;

    let filter = '/search?jql=';

    const today = new Date();
    var startDate = today;
    var endDate = today;

    // ? Valida data inicial
    if (!worklogInitial) {
      const date = new Date(today.getFullYear(), today.getMonth(), 1);
      const utcDate = zonedTimeToUtc(date, 'America/Sao_Paulo')
      const dateFormatted = moment(utcDate).format('YYYY-MM-DD');

      filter += `updated>=${dateFormatted} and `;
      startDate = utcDate;
    } else {
      filter += `updated>=${worklogInitial} and `;
      startDate = zonedTimeToUtc(worklogInitial, 'America/Sao_Paulo');
    }

    // ? Valida data final
    if (!worklogEnd) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
      date.setDate(date.getDate() - 1);
      const dateFormatted = moment(zonedTimeToUtc(date, 'America/Sao_Paulo')).format('YYYY-MM-DD');

      filter += `updated<=${dateFormatted}`;

      const newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
      endDate = zonedTimeToUtc(newDate, 'America/Sao_Paulo');
    } else {
      filter += `updated<=${worklogEnd}`;
      const newDate = new Date(worklogEnd);
      const dateFormatted = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), 23, 59, 59);
      endDate = zonedTimeToUtc(dateFormatted, 'America/Sao_Paulo');
    }

    // ? Adiciona o usuário solicitado no filtro
    if (worklogAuthor) {
      filter += ` and worklogAuthor="${worklogAuthor}"`;
    }

    // ? Adiciona o projeto solicitado no filtro
    if (project) {
      filter += ` and project="${project}"`;
    }

    const projects: Array<ProjectDetails> = [];

    console.log(filter, "filter");

    try {
      const config = {
        headers: {
          'Authorization': `Basic ZGVuaXMuYXpldmVkb0Bua2V5LmNvbS5icjp5NG92c1RhbzROd0poV0JvcWhlUjQ3RkE=`,
          'Content-Type': `application/json;charset=UTF-8`,
        },
      }

      const url = `https://nkey.atlassian.net/rest/api/latest${filter}&maxResults=100&startAt=0&fields=key,project`

      const result = await axios.get(url, config).then((res) => res.data);

      const issues: Array<Issue> = result.issues;
      const total = result.total;
      let startAt = result.startAt + 100;

      if (total > result.startAt) {
        do {
          const url = `https://nkey.atlassian.net/rest/api/latest${filter}&maxResults=100&startAt=${startAt}&fields=key,project`
          const res = await axios.get(url, config).then((res) => res.data);

          if (res.issues.length) {
            issues.push(res.issues);
          }
          startAt += 100;
        } while (total >= startAt);
      }

      const requests = [];

      for (const issue of issues) {
        if (!issue || !issue.id) {
          continue;
        }
        const url = `https://nkey.atlassian.net/rest/api/latest/issue/${issue.id}/worklog`;
        const res = axios.get(url, config);
        requests.push(res);

        const project = projects.find((p) => issue.fields && p.id === issue.fields.project.id)
        if (project) {
          project.issueIds.add(issue.id);
        } else {
          const newProject: ProjectDetails = {
            id: issue.fields?.project.id,
            name: issue.fields?.project.name,
            totalSpend: '',
            totalSpendSeconds: 0,
            issueIds: new Set([issue.id]),
          };

          projects.push(newProject);

        }

      }

      const futures: Array<AxiosResponse<any>> = await Promise.all(requests);

      var totalTimer = 0;
      for (var future of futures) {
        for (var worklog of future.data.worklogs) {
          const date = new Date(worklog.updated);
          // console.log("WorkLog data:", date);
          // console.log("data inicio:", startDate);
          // console.log("data fim:", endDate);
          // // * Soma o tempo gasto das tarefas dentro do periodo filtrado
          // console.log("WorklogId: ", worklog.id);
          // console.log("IssueId: ", worklog.issueId);
          // console.log("TimeSpent: ", worklog.timeSpent);

          if (date.getTime() >= startDate.getTime() && date.getTime() <= endDate.getTime()) {
            totalTimer += worklog.timeSpentSeconds;
            const project = projects.find(
              (element) => element.issueIds.has(worklog.issueId));

            project.totalSpendSeconds += worklog.timeSpentSeconds;
            const totalSpent = moment.utc(moment.duration(project.totalSpendSeconds, "seconds").asMilliseconds()).format("HH:mm:ss");
            project.totalSpend = totalSpent;
            project.issueIds.add(worklog.issueId);
          }
        }
      }

      const totalSpent = moment.utc(moment.duration(totalTimer, "seconds").asMilliseconds()).format("HH:mm:ss");

      return response.json({
        totalSpent,
        projects,
      });



    } catch (error) {
      console.error(error);
      return response.status(400).json({ "erro": JSON.stringify(error) });
    }



  }
}

export { DeveloperController };
